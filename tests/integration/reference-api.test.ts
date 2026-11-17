import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getCategories } from "@/app/api/v1/categories/route";
import { GET as getProvinces } from "@/app/api/v1/provinces/route";
import * as service from "@/lib/services/reference";
import { categorySchema, provinceSchema } from "@/lib/validation/reference";
import { resetAndSeed } from "../support/db";

describe("GET /api/v1/provinces", () => {
  beforeEach(resetAndSeed);

  it("returns 200 with every province in the public shape", async () => {
    const res = await getProvinces();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(25);
    // The response must match the Zod schema the frontend uses.
    expect(() => provinceSchema.array().parse(body.data)).not.toThrow();
  });

  it("lets browsers and CDNs cache the response", async () => {
    const res = await getProvinces();
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("returns 500 with an error body when the service fails", async () => {
    const spy = vi.spyOn(service, "listProvinces").mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    const res = await getProvinces();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "internal_error", message: "Could not load provinces" },
    });
    spy.mockRestore();
  });
});

describe("GET /api/v1/categories", () => {
  beforeEach(resetAndSeed);

  it("returns 200 with every category in the public shape", async () => {
    const res = await getCategories();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(5);
    expect(() => categorySchema.array().parse(body.data)).not.toThrow();
  });

  it("returns 500 with an error body when the service fails", async () => {
    const spy = vi.spyOn(service, "listCategories").mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    const res = await getCategories();
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});
