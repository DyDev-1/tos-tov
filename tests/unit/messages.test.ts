import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import km from "../../messages/km.json";

// Every text must exist in both Khmer and English (CLAUDE.md UX rule).
function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("translation files", () => {
  it("have the same keys in English and Khmer", () => {
    expect(keys(km).sort()).toEqual(keys(en).sort());
  });
});
