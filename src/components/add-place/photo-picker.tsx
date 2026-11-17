"use client";

import { Camera, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_PHOTOS_PER_PLACE } from "@/lib/uploads-shared";

export type PhotoItem = {
  id: string;
  name: string;
  previewUrl: string;
  blob: Blob;
  contentType: "image/webp" | "image/jpeg";
};

// Step 1: a dashed "Add photos" tile, then a thumbnail for each photo (the first is the cover).
// The parent makes the photos smaller; this only shows them and reports clicks.
export function PhotoPicker({
  items,
  processing,
  messages,
  error,
  label,
  onAdd,
  onRemove,
}: {
  items: PhotoItem[];
  processing: boolean;
  messages: string[];
  error?: string;
  /** Text of the heading. Defaults to "1. Photos". */
  label?: string;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("AddPlace.photos");
  const full = items.length >= MAX_PHOTOS_PER_PLACE;

  return (
    <fieldset aria-describedby="photos-hint" aria-invalid={!!error} className="space-y-3">
      <legend className="mb-2 font-bold">{label ?? t("label")}</legend>
      <ul className="grid grid-cols-3 gap-3">
        <li>
          <label
            className={
              "flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-secondary text-center font-semibold text-primary transition-colors hover:bg-secondary/70 focus-within:ring-2 focus-within:ring-ring " +
              (full ? "pointer-events-none opacity-50" : "")
            }
          >
            <Camera aria-hidden className="size-6" />
            <span className="px-1 text-sm">{t("add")}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={full}
              className="sr-only"
              data-testid="photo-input"
              onChange={(event) => {
                onAdd(Array.from(event.target.files ?? []));
                event.target.value = ""; // so the same photo can be picked again
              }}
            />
          </label>
        </li>
        {items.map((item, index) => (
          <li key={item.id} data-testid="photo-thumb" className="relative aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the file just picked */}
            <img src={item.previewUrl} alt={t("preview", { n: index + 1 })} className="size-full rounded-2xl object-cover" />
            {index === 0 && (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold">
                {t("cover")}
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={t("remove", { n: index + 1 })}
              className="absolute -top-2 -right-2 grid size-11 place-items-center"
            >
              <span className="grid size-7 place-items-center rounded-full bg-foreground text-background shadow">
                <X aria-hidden className="size-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p id="photos-hint" className="text-sm text-muted-foreground">
        {processing ? t("processing") : t("hint")} · {t("count", { count: items.length, max: MAX_PHOTOS_PER_PLACE })}
      </p>
      {messages.map((message) => (
        <p key={message} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ))}
      {error && (
        <p id="photos-error" role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
