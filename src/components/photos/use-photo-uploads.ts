"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { prepareImage } from "@/lib/images";
import { checkImageFile, MAX_PHOTOS_PER_PLACE } from "@/lib/uploads-shared";
import type { PhotoItem } from "@/components/add-place/photo-picker";

export type UploadOutcome = string[] | "uploads_off" | "login" | "failed";

// Everything about photos in a form: pick them, check them, make them smaller, show previews,
// and upload them straight to Cloudflare R2 with a link our server signs. Used by "Add a place" and "Share a post".
export function usePhotoUploads() {
  const t = useTranslations("AddPlace.photos");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const uploaded = useRef(new Map<string, string>()); // photo id -> public URL, so a retry never uploads twice

  // Free the preview images from memory when leaving the page.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const addPhotos = useCallback(
    async (files: File[]) => {
      const found: string[] = [];
      const room = MAX_PHOTOS_PER_PLACE - photosRef.current.length;
      const chosen = files.slice(0, Math.max(room, 0));
      if (files.length > chosen.length) found.push(t("tooMany", { max: MAX_PHOTOS_PER_PLACE }));

      setProcessing(true);
      const added: PhotoItem[] = [];
      for (const file of chosen) {
        const check = checkImageFile(file);
        if (check === "not_image") found.push(t("notImage", { name: file.name }));
        else if (check === "too_big") found.push(t("tooBig", { name: file.name }));
        else {
          try {
            const prepared = await prepareImage(file);
            added.push({
              id: crypto.randomUUID(),
              name: file.name,
              previewUrl: URL.createObjectURL(prepared.blob),
              blob: prepared.blob,
              contentType: prepared.contentType,
            });
          } catch {
            found.push(t("cannotRead", { name: file.name }));
          }
        }
      }
      setProcessing(false);
      setMessages(found);
      if (added.length > 0) setPhotos((list) => [...list, ...added]);
      return added.length;
    },
    [t],
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((list) => {
      const gone = list.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return list.filter((p) => p.id !== id);
    });
    uploaded.current.delete(id);
    setMessages([]);
  }, []);

  const reset = useCallback(() => {
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setMessages([]);
    uploaded.current.clear();
  }, []);

  // Upload each photo. `onProgress` says which one is going (1-based). Returns the public URLs,
  // or why it stopped.
  const upload = useCallback(
    async (onProgress?: (current: number, total: number) => void): Promise<UploadOutcome> => {
      const urls: string[] = [];
      for (const [index, photo] of photosRef.current.entries()) {
        const known = uploaded.current.get(photo.id);
        if (known) {
          urls.push(known);
          continue;
        }
        onProgress?.(index + 1, photosRef.current.length);
        const link = await apiFetch<{ uploadUrl: string; publicUrl: string; headers: Record<string, string> }>(
          "/api/v1/uploads/image",
          { method: "POST", body: JSON.stringify({ contentType: photo.contentType, size: photo.blob.size }) },
        );
        if (!link.ok) return link.status === 503 ? "uploads_off" : link.status === 401 ? "login" : "failed";
        try {
          const put = await fetch(link.data.uploadUrl, { method: "PUT", headers: link.data.headers, body: photo.blob });
          if (!put.ok) return "failed";
        } catch {
          return "failed";
        }
        uploaded.current.set(photo.id, link.data.publicUrl);
        urls.push(link.data.publicUrl);
      }
      return urls;
    },
    [],
  );

  return { photos, messages, processing, addPhotos, removePhoto, reset, upload };
}
