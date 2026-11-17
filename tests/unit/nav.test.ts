import { describe, expect, it } from "vitest";
import { isNavActive } from "@/lib/nav";

describe("isNavActive", () => {
  it("marks Explore active only on the home page", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/map", "/")).toBe(false);
  });

  it("marks a section active on its own page", () => {
    expect(isNavActive("/map", "/map")).toBe(true);
  });

  it("keeps a section active on its sub-pages", () => {
    expect(isNavActive("/saved/places", "/saved")).toBe(true);
  });

  it("does not match a different section that starts with the same letters", () => {
    expect(isNavActive("/mapping", "/map")).toBe(false);
  });
});
