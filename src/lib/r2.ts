import "server-only";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 holds the photos. The browser uploads straight to R2 with a short-lived link we sign,
// so photo bytes never pass through our server. The database stores only the public URL.
// R2 speaks the same language as Amazon S3, so we use the S3 library.

import { ALLOWED_IMAGE_TYPES } from "@/lib/uploads-shared";

type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicUrl: string };

export function getR2Config(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    publicUrl: R2_PUBLIC_URL.replace(/\/+$/, ""),
  };
}

// Base address that every stored photo URL must start with. null when uploads are not set up.
export function publicPhotoBase(): string | null {
  return getR2Config()?.publicUrl ?? null;
}

export type UploadLink = { uploadUrl: string; publicUrl: string; key: string; headers: Record<string, string> };

// A link the browser can PUT one image to, for 5 minutes. The size and type are part of the signature,
// so a different file (a bigger one, or not an image) is refused by R2.
export async function createUploadLink(
  userId: number,
  file: { contentType: (typeof ALLOWED_IMAGE_TYPES)[number]; size: number },
): Promise<UploadLink> {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const extension = file.contentType === "image/webp" ? "webp" : "jpg";
  const key = `places/${userId}/${randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: file.contentType,
      ContentLength: file.size,
      CacheControl: "public, max-age=31536000, immutable",
    }),
    { expiresIn: 300 },
  );
  return {
    uploadUrl,
    publicUrl: `${config.publicUrl}/${key}`,
    key,
    headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  };
}
