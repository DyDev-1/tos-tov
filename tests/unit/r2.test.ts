import { afterEach, describe, expect, it, vi } from "vitest";
import { createUploadLink, getR2Config, publicPhotoBase } from "@/lib/r2";

const R2_ENV = {
  R2_ACCOUNT_ID: "acct123",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "tostov-photos",
  R2_PUBLIC_URL: "https://photos.example.com/",
};

afterEach(() => vi.unstubAllEnvs());

describe("R2 settings", () => {
  it("is off when any setting is missing", () => {
    expect(getR2Config({ ...R2_ENV, R2_BUCKET: "" })).toBeNull();
    expect(getR2Config({})).toBeNull();
  });

  it("reads the settings and trims the slash at the end of the public address", () => {
    expect(getR2Config(R2_ENV)?.publicUrl).toBe("https://photos.example.com");
  });

  it("gives the public base only when uploads are set up", () => {
    expect(publicPhotoBase()).toBeNull();
    for (const [key, value] of Object.entries(R2_ENV)) vi.stubEnv(key, value);
    expect(publicPhotoBase()).toBe("https://photos.example.com");
  });
});

describe("createUploadLink", () => {
  it("makes a signed link for one image in the person's own folder", async () => {
    for (const [key, value] of Object.entries(R2_ENV)) vi.stubEnv(key, value);
    const link = await createUploadLink(42, { contentType: "image/webp", size: 123_456 });

    expect(link.publicUrl).toMatch(/^https:\/\/photos\.example\.com\/places\/42\/[0-9a-f-]{36}\.webp$/);
    const url = new URL(link.uploadUrl);
    expect(url.host).toBe("tostov-photos.acct123.r2.cloudflarestorage.com");
    expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    // The size and type are signed, so R2 refuses a different file.
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-length");
    expect(link.headers["Content-Type"]).toBe("image/webp");
  });

  it("gives each upload its own name", async () => {
    for (const [key, value] of Object.entries(R2_ENV)) vi.stubEnv(key, value);
    const a = await createUploadLink(1, { contentType: "image/jpeg", size: 10 });
    const b = await createUploadLink(1, { contentType: "image/jpeg", size: 10 });
    expect(a.key).not.toBe(b.key);
    expect(a.key.endsWith(".jpg")).toBe(true);
  });

  it("refuses when R2 is not set up", async () => {
    await expect(createUploadLink(1, { contentType: "image/webp", size: 10 })).rejects.toThrow("not configured");
  });
});
