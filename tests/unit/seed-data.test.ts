import { describe, expect, it } from "vitest";
import { categorySeed, provinceSeed } from "@/db/seed-data";

const KHMER = /[ក-៿]/;

describe("seed data", () => {
  it("has Cambodia's 25 provinces", () => {
    expect(provinceSeed).toHaveLength(25);
  });

  it("has the 5 categories from the design", () => {
    expect(categorySeed.map((c) => c.slug)).toEqual(["temples", "waterfalls", "beaches", "mountains", "food"]);
  });

  it.each([
    ["provinces", provinceSeed],
    ["categories", categorySeed],
  ])("%s have unique, URL-safe slugs", (_name, items) => {
    const slugs = items.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each([
    ["provinces", provinceSeed],
    ["categories", categorySeed],
  ])("%s have an English and a Khmer name", (_name, items) => {
    for (const item of items) {
      expect(item.nameEn.trim()).not.toBe("");
      expect(item.nameKm).toMatch(KHMER);
    }
  });
});
