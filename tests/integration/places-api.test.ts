import { beforeEach, describe, expect, it } from "vitest";
import { GET as getPlace } from "@/app/api/v1/places/[slug]/route";
import { GET as getPlaces } from "@/app/api/v1/places/route";
import { placeCardSchema, placeDetailSchema } from "@/lib/validation/places";
import { resetAndSeedPlaces } from "../support/db";

const request = (qs = "") => new Request(`http://localhost/api/v1/places${qs}`);
const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) }) as never;

describe("GET /api/v1/places", () => {
  beforeEach(resetAndSeedPlaces);

  it("returns places matching the public schema, with a total", async () => {
    const res = await getPlaces(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta).toEqual({ total: 8, limit: 20, offset: 0 });
    expect(() => placeCardSchema.array().parse(body.data)).not.toThrow();
  });

  it("applies filters from the query string", async () => {
    const body = await (await getPlaces(request("?category=beaches&month=11"))).json();
    expect(body.data.map((p: { slug: string }) => p.slug).sort()).toEqual(["lazy-beach-koh-rong-sanloem", "long-set-beach"]);
  });

  it("rejects a month that does not exist", async () => {
    const res = await getPlaces(request("?month=13"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_query");
  });

  it("rejects an oversized page", async () => {
    expect((await getPlaces(request("?limit=5000"))).status).toBe(400);
  });

  it("rejects a province that is not a slug", async () => {
    expect((await getPlaces(request("?province=" + encodeURIComponent("x; drop table")))).status).toBe(400);
  });

  it("is cacheable", async () => {
    expect((await getPlaces(request())).headers.get("Cache-Control")).toContain("max-age=60");
  });
});

describe("GET /api/v1/places/:slug", () => {
  beforeEach(resetAndSeedPlaces);

  it("returns one place in the detail shape", async () => {
    const res = await getPlace(request(), ctx("bou-sra-waterfall"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(() => placeDetailSchema.parse(body.data)).not.toThrow();
    expect(body.data.name.en).toBe("Bou Sra Waterfall");
  });

  it("returns 404 for an unknown place", async () => {
    const res = await getPlace(request(), ctx("nope"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });
});
