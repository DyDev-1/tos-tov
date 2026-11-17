import { jsonData, jsonError, readJson, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createUploadLink, getR2Config } from "@/lib/r2";
import { uploadRequestSchema } from "@/lib/validation/place-input";

// POST /api/v1/uploads/image  { contentType: "image/webp" | "image/jpeg", size }
// Response: { data: { uploadUrl, publicUrl, headers } }. The browser PUTs the image to uploadUrl
// (straight to Cloudflare R2), then sends publicUrl when it adds the place. Needs login.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = uploadRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(400, "invalid_body", "Only WebP or JPEG images up to 10 MB are accepted", parsed.error.flatten().fieldErrors);
    }
    if (!getR2Config()) return jsonError(503, "uploads_not_configured", "Photo uploads are not set up yet");

    const link = await createUploadLink(user.id, parsed.data);
    return jsonData({ uploadUrl: link.uploadUrl, publicUrl: link.publicUrl, headers: link.headers });
  } catch (error) {
    console.error("POST /api/v1/uploads/image failed", error);
    return jsonError(500, "internal_error", "Could not prepare the upload");
  }
}
