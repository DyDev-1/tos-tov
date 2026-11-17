import { describe, expect, it } from "vitest";
import { runSmoke } from "@/lib/smoke-test";

// A pretend site, so the check runs without a network.
type Overrides = Partial<Record<string, () => Response>>;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const healthy: Record<string, () => Response> = {
  "/api/v1/health": () => json(200, { status: "ok", database: "up" }),
  "/api/v1/provinces": () => json(200, { data: Array.from({ length: 25 }, (_, i) => ({ id: i })) }),
  "/api/v1/categories": () => json(200, { data: [{ id: 1 }] }),
  "/api/v1/places?limit=1": () => json(200, { data: [], meta: { total: 0 } }),
  "/api/v1/features": () => json(200, { data: { stage: 1 } }),
  "/en": () => new Response('<html lang="en" class="x">', { status: 200, headers: { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" } }),
  "/km": () => new Response('<html lang="km" class="x">', { status: 200 }),
  "/api/v1/admin/overview": () => json(401, { error: { code: "unauthorized" } }),
  "/en/admin": () => new Response(null, { status: 307, headers: { location: "/en/sign-in?redirect_url=%2Fen%2Fadmin" } }),
};
const site = (overrides: Overrides = {}) => async (url: string) => {
  const path = url.replace("https://site.example.com", "");
  const handler = overrides[path] ?? healthy[path];
  if (!handler) throw new Error(`Unexpected ${path}`);
  return handler();
};
const run = (overrides: Overrides = {}, options = {}) => runSmoke("https://site.example.com/", { fetchFn: site(overrides), ...options });
const failed = (results: Awaited<ReturnType<typeof run>>) => results.filter((r) => !r.ok).map((r) => r.name);

describe("runSmoke", () => {
  it("passes on a healthy site", async () => {
    const results = await run();
    expect(failed(results)).toEqual([]);
    expect(results.length).toBeGreaterThanOrEqual(9);
  });

  it("ignores a slash at the end of the address", async () => {
    expect(failed(await run())).toEqual([]);
  });

  it("fails when the database is down", async () => {
    expect(failed(await run({ "/api/v1/health": () => json(503, { status: "degraded", database: "down" }) }))).toEqual(["Database answers (/api/v1/health)"]);
  });

  it("fails when the provinces were not loaded", async () => {
    expect(failed(await run({ "/api/v1/provinces": () => json(200, { data: [] }) }))).toEqual(["All 25 provinces are there"]);
  });

  it("fails when a page is broken", async () => {
    expect(failed(await run({ "/km": () => new Response("Server error", { status: 500 }) }))).toEqual(["Khmer home page opens"]);
    expect(failed(await run({ "/en": () => new Response("<html>", { status: 200, headers: { "x-content-type-options": "nosniff", "referrer-policy": "x" } }) }))).toEqual(["English home page opens"]);
  });

  it("fails when a network call throws", async () => {
    const results = await runSmoke("https://site.example.com", { fetchFn: async () => { throw new Error("connection refused"); } });
    expect(failed(results).length).toBe(results.length);
    expect(results[0].detail).toBe("connection refused");
  });

  it("checks the release stage only when told what to expect", async () => {
    expect(failed(await run({}, { expectStage: 1 }))).toEqual([]);
    const wrong = await run({}, { expectStage: 3 });
    expect(failed(wrong)).toEqual(["Release stage is as expected (/api/v1/features)"]);
    expect(wrong.find((r) => !r.ok)!.detail).toContain("expected 3");
  });

  it("fails when the admin area is open to visitors", async () => {
    expect(failed(await run({ "/api/v1/admin/overview": () => json(200, { data: {} }) }))).toEqual(["The admin API is closed to visitors"]);
    expect(failed(await run({ "/en/admin": () => new Response("<html>", { status: 200 }) }))).toEqual(["The admin pages are closed to visitors"]);
  });

  it("fails when the security headers are missing", async () => {
    expect(failed(await run({ "/en": () => new Response('<html lang="en">', { status: 200 }) }))).toEqual(["Security headers are set"]);
  });
});
