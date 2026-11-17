import { describe, expect, it } from "vitest";
import { localizeInput, slugify } from "@/lib/i18n-content";
import { checkImageFile } from "@/lib/uploads-shared";
import { createPlaceInputSchema, nearbyQuerySchema, uploadRequestSchema } from "@/lib/validation/place-input";

const valid = {
  name: "Bou Sra Waterfall",
  provinceSlug: "mondulkiri",
  categorySlug: "waterfalls",
  lat: 12.5135,
  lng: 107.4287,
  photos: ["https://photos.example.com/places/1/a.webp"],
};

describe("slugify", () => {
  it("makes a web-friendly name", () => {
    expect(slugify("Bou Sra Waterfall!")).toBe("bou-sra-waterfall");
    expect(slugify("  Café   Kep  ")).toBe("cafe-kep");
  });
  it("gives an empty text for Khmer-only names", () => {
    expect(slugify("ទឹកធ្លាក់ប៊ូស្រា")).toBe("");
  });
  it("keeps it short", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(60);
  });
});

describe("localizeInput", () => {
  it("files Khmer text under km and other text under en", () => {
    expect(localizeInput("ទឹកធ្លាក់ស្អាត")).toEqual({ km: "ទឹកធ្លាក់ស្អាត" });
    expect(localizeInput("  Nice falls ")).toEqual({ en: "Nice falls" });
  });
  it("returns nothing for empty text", () => {
    expect(localizeInput("   ")).toBeUndefined();
    expect(localizeInput(undefined)).toBeUndefined();
  });
});

describe("checkImageFile", () => {
  it("accepts an image under 10 MB", () => {
    expect(checkImageFile({ type: "image/png", size: 2_000_000 })).toBe("ok");
  });
  it("refuses a file that is not an image", () => {
    expect(checkImageFile({ type: "application/pdf", size: 100 })).toBe("not_image");
  });
  it("refuses an image over 10 MB", () => {
    expect(checkImageFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).toBe("too_big");
  });
});

describe("createPlaceInputSchema", () => {
  it("accepts the required details and fills the defaults", () => {
    const parsed = createPlaceInputSchema.parse(valid);
    expect(parsed.bestMonths).toEqual([]);
    expect(parsed.allowDuplicate).toBe(false);
  });

  it.each([
    ["no photos", { photos: [] }],
    ["11 photos", { photos: Array.from({ length: 11 }, (_, i) => `https://x.example.com/${i}.webp`) }],
    ["a photo that is not a web address", { photos: ["not a url"] }],
    ["a one-letter name", { name: "A" }],
    ["a pin in the sea", { lat: 5, lng: 100 }],
    ["a pin outside Cambodia", { lat: 48.8, lng: 2.3 }],
    ["a month 13", { bestMonths: [13] }],
    ["a negative fee", { entryFeeKhr: -1 }],
    ["a fee with half a riel", { entryFeeKhr: 1.5 }],
    ["a province that is not a slug", { provinceSlug: "Siem Reap" }],
  ])("rejects %s", (_name, change) => {
    expect(createPlaceInputSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });

  it("sorts and de-duplicates months", () => {
    expect(createPlaceInputSchema.parse({ ...valid, bestMonths: [11, 9, 11, 10] }).bestMonths).toEqual([9, 10, 11]);
  });

  it("allows free entry (0)", () => {
    const parsed = createPlaceInputSchema.parse({ ...valid, entryFeeKhr: 0, entryFeeUsd: 0 });
    expect(parsed.entryFeeKhr).toBe(0);
    expect(parsed.entryFeeUsd).toBe(0);
  });
});

describe("uploadRequestSchema", () => {
  it("accepts WebP and JPEG up to 10 MB", () => {
    expect(uploadRequestSchema.safeParse({ contentType: "image/webp", size: 500_000 }).success).toBe(true);
    expect(uploadRequestSchema.safeParse({ contentType: "image/jpeg", size: 10 * 1024 * 1024 }).success).toBe(true);
  });
  it("refuses other types and sizes", () => {
    expect(uploadRequestSchema.safeParse({ contentType: "image/svg+xml", size: 100 }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ contentType: "text/html", size: 100 }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ contentType: "image/webp", size: 10 * 1024 * 1024 + 1 }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ contentType: "image/webp", size: 0 }).success).toBe(false);
  });
});

describe("nearbyQuerySchema", () => {
  it("turns text into numbers and sets a default radius", () => {
    expect(nearbyQuerySchema.parse({ lat: "12.5", lng: "107.4" })).toEqual({ lat: 12.5, lng: 107.4, radius: 500, limit: 3 });
  });
  it("refuses a missing or impossible position", () => {
    expect(nearbyQuerySchema.safeParse({ lat: "12.5" }).success).toBe(false);
    expect(nearbyQuerySchema.safeParse({ lat: "99", lng: "0" }).success).toBe(false);
  });
});
