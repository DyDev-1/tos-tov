// Make a photo smaller before it is uploaded (CLAUDE.md: resize to WebP). A 5 MB phone photo
// becomes a few hundred KB, so it uploads quickly even on a slow connection.
// This runs in the browser, using a canvas.

const MAX_SIDE = 1600; // pixels on the longest side

export type PreparedImage = { blob: Blob; contentType: "image/webp" | "image/jpeg" };

export async function prepareImage(file: File): Promise<PreparedImage> {
  // "from-image" applies the phone's rotation, so portrait photos are not sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await toBlob("image/webp", 0.82);
  if (webp && webp.type === "image/webp") return { blob: webp, contentType: "image/webp" };
  // A few older browsers cannot make WebP. JPEG is the safe fallback.
  const jpeg = await toBlob("image/jpeg", 0.85);
  if (!jpeg) throw new Error("Could not prepare the image");
  return { blob: jpeg, contentType: "image/jpeg" };
}
