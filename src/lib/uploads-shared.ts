// Upload limits and checks used by both the form (browser) and the server.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB each
export const ALLOWED_IMAGE_TYPES = ["image/webp", "image/jpeg"] as const;
export const MAX_PHOTOS_PER_PLACE = 10;

// Is this file something we accept before resizing? Any image up to 10 MB.
export function checkImageFile(file: { type: string; size: number }): "ok" | "not_image" | "too_big" {
  if (!file.type.startsWith("image/")) return "not_image";
  if (file.size > MAX_IMAGE_BYTES) return "too_big";
  return "ok";
}
