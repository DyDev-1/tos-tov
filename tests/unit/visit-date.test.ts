import { describe, expect, it } from "vitest";
import { isValidVisitDate, todayInCambodia } from "@/lib/dates";
import { createPostInputSchema } from "@/lib/validation/posts";

const NOW = new Date("2026-11-17T05:00:00Z");

describe("todayInCambodia", () => {
  it("uses Cambodia's date, not UTC's", () => {
    // 20:00 UTC on 16 Nov is already 03:00 on 17 Nov in Phnom Penh.
    expect(todayInCambodia(new Date("2026-11-16T20:00:00Z"))).toBe("2026-11-17");
    expect(todayInCambodia(new Date("2026-11-16T10:00:00Z"))).toBe("2026-11-16");
  });
});

describe("isValidVisitDate", () => {
  it("accepts today and past days", () => {
    expect(isValidVisitDate("2026-11-17", NOW)).toBe(true);
    expect(isValidVisitDate("2025-01-01", NOW)).toBe(true);
  });
  it("refuses days in the future", () => {
    expect(isValidVisitDate("2026-11-18", NOW)).toBe(false);
    expect(isValidVisitDate("2027-01-01", NOW)).toBe(false);
  });
  it("refuses days that do not exist or are written wrongly", () => {
    expect(isValidVisitDate("2026-02-31", NOW)).toBe(false);
    expect(isValidVisitDate("17/11/2026", NOW)).toBe(false);
    expect(isValidVisitDate("", NOW)).toBe(false);
  });
  it("refuses a date more than 60 years ago", () => {
    expect(isValidVisitDate("1960-01-01", NOW)).toBe(false);
  });
});

describe("createPostInputSchema", () => {
  const valid = { story: "A lovely quiet morning here.", rating: 5, visitedAt: "2020-01-01" };

  it("accepts a post and defaults to no photos", () => {
    expect(createPostInputSchema.parse(valid).photos).toEqual([]);
  });
  it.each([
    ["a story that is too short", { story: "Nice" }],
    ["a story that is too long", { story: "x".repeat(3001) }],
    ["rating 0", { rating: 0 }],
    ["rating 6", { rating: 6 }],
    ["a half star", { rating: 4.5 }],
    ["a rating written as text", { rating: "5" }],
    ["a future day", { visitedAt: "2999-01-01" }],
    ["more than 10 photos", { photos: Array.from({ length: 11 }, (_, i) => `https://x.example.com/${i}.webp`) }],
  ])("rejects %s", (_name, change) => {
    expect(createPostInputSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});
