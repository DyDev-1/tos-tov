import { describe, expect, it } from "vitest";
import { localeSchema, paginationSchema } from "@/lib/validation/common";

describe("localeSchema", () => {
  it("accepts the two supported languages", () => {
    expect(localeSchema.parse("en")).toBe("en");
    expect(localeSchema.parse("km")).toBe("km");
  });

  it("rejects any other language", () => {
    expect(localeSchema.safeParse("fr").success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("uses defaults when nothing is given", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("turns query string text into numbers", () => {
    expect(paginationSchema.parse({ page: "3", pageSize: "10" })).toEqual({ page: 3, pageSize: 10 });
  });

  it("rejects a page size above 50", () => {
    expect(paginationSchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});
