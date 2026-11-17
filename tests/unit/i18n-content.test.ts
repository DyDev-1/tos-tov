import { describe, expect, it } from "vitest";
import { pickText } from "@/lib/i18n-content";

describe("pickText", () => {
  it("returns the text in the page language", () => {
    expect(pickText({ en: "Hello", km: "សួស្តី" }, "km")).toBe("សួស្តី");
  });
  it("falls back to the other language when one is missing", () => {
    expect(pickText({ en: "Hello", km: null }, "km")).toBe("Hello");
    expect(pickText({ en: "", km: "សួស្តី" }, "en")).toBe("សួស្តី");
  });
  it("returns null when there is no text at all", () => {
    expect(pickText({ en: " ", km: null }, "en")).toBeNull();
    expect(pickText(undefined, "en")).toBeNull();
  });
});
