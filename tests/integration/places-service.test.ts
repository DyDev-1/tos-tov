import { beforeEach, describe, expect, it } from "vitest";
import { getPlaceBySlug, listPlaces } from "@/lib/services/places";
import { listPlacesQuerySchema } from "@/lib/validation/places";
import { db, resetAndSeedPlaces } from "../support/db";
import { places } from "@/db/schema";
import { eq } from "drizzle-orm";

const query = (overrides: Record<string, unknown> = {}) => listPlacesQuerySchema.parse(overrides);

describe("listPlaces", () => {
  beforeEach(resetAndSeedPlaces);

  it("lists published places, most liked first", async () => {
    const { items, total } = await listPlaces(query());
    expect(total).toBe(8);
    expect(items[0].slug).toBe("angkor-wat");
    expect(items.map((p) => p.likesCount)).toEqual([...items.map((p) => p.likesCount)].sort((a, b) => b - a));
  });

  it("filters by province and category", async () => {
    const byProvince = await listPlaces(query({ province: "preah-sihanouk" }));
    expect(byProvince.items.map((p) => p.slug).sort()).toEqual(["lazy-beach-koh-rong-sanloem", "long-set-beach"]);

    const byCategory = await listPlaces(query({ category: "waterfalls" }));
    expect(byCategory.items.map((p) => p.slug).sort()).toEqual(["bou-sra-waterfall", "chambok-waterfall"]);
  });

  it("filters by best month", async () => {
    const july = await listPlaces(query({ month: 7 }));
    expect(july.items.map((p) => p.slug).sort()).toEqual(["bou-sra-waterfall", "chambok-waterfall"]);
    const november = await listPlaces(query({ month: 11 }));
    expect(november.items.length).toBeGreaterThanOrEqual(4);
    for (const place of november.items) expect(place.bestMonths).toContain(11);
  });

  it("searches by English name, ignoring case", async () => {
    const { items } = await listPlaces(query({ q: "bou SRA" }));
    expect(items.map((p) => p.slug)).toEqual(["bou-sra-waterfall"]);
  });

  it("searches by Khmer name", async () => {
    const { items } = await listPlaces(query({ q: "អង្គរ" }));
    expect(items.map((p) => p.slug)).toEqual(["angkor-wat"]);
  });

  it("treats % and _ in the search as normal characters", async () => {
    expect((await listPlaces(query({ q: "%" }))).items).toEqual([]);
    expect((await listPlaces(query({ q: "_" }))).items).toEqual([]);
  });

  it("combines filters", async () => {
    const { items } = await listPlaces(query({ province: "siem-reap", category: "temples", month: 11 }));
    expect(items.map((p) => p.slug)).toEqual(["angkor-wat"]);
  });

  it("sorts newest first", async () => {
    const { items } = await listPlaces(query({ sort: "recent" }));
    expect(items[0].slug).toBe("phnom-chhngok-cave-temple");
  });

  it("pages through results and reports the total", async () => {
    const page = await listPlaces(query({ limit: 3, offset: 3 }));
    expect(page.items).toHaveLength(3);
    expect(page.total).toBe(8);
  });

  it("never shows pending or hidden places", async () => {
    await db.update(places).set({ status: "pending" }).where(eq(places.slug, "angkor-wat"));
    await db.update(places).set({ status: "hidden" }).where(eq(places.slug, "phnom-kulen"));
    const { items, total } = await listPlaces(query());
    expect(total).toBe(6);
    expect(items.map((p) => p.slug)).not.toContain("angkor-wat");
    expect(items.map((p) => p.slug)).not.toContain("phnom-kulen");
  });

  it("returns the public card shape with the map position", async () => {
    const { items } = await listPlaces(query({ q: "Bou Sra" }));
    expect(items[0]).toEqual({
      id: expect.any(Number),
      slug: "bou-sra-waterfall",
      name: { en: "Bou Sra Waterfall", km: "ទឹកធ្លាក់ប៊ូស្រា" },
      tagline: { en: "Full flow after the rains", km: expect.any(String) },
      province: { id: expect.any(Number), slug: "mondulkiri", name: { en: "Mondulkiri", km: "មណ្ឌលគិរី" } },
      category: { id: expect.any(Number), slug: "waterfalls", name: { en: "Waterfalls", km: "ទឹកធ្លាក់" } },
      location: { lat: expect.closeTo(12.5135, 3), lng: expect.closeTo(107.4287, 3) },
      likesCount: 1248,
      bestMonths: [7, 8, 9, 10, 11, 12],
      coverPhoto: null,
      addedBy: "Sokha",
      createdAt: expect.any(String),
    });
  });
});

describe("getPlaceBySlug", () => {
  beforeEach(resetAndSeedPlaces);

  it("returns the full place page data", async () => {
    const place = await getPlaceBySlug("bou-sra-waterfall");
    expect(place).not.toBeNull();
    expect(place!.avoidMonths).toEqual([3, 4]);
    expect(place!.details.ticket?.en).toContain("Pay at the gate");
    expect(place!.entryFee).toEqual({ khr: null, usd: null });
    expect(place!.guides).toHaveLength(2);
    expect(place!.commentsCount).toBe(2);
    expect(place!.description.km).toBeTruthy();
  });

  it("returns null for an unknown place", async () => {
    expect(await getPlaceBySlug("does-not-exist")).toBeNull();
  });

  it("returns null for a place that is not published", async () => {
    await db.update(places).set({ status: "pending" }).where(eq(places.slug, "angkor-wat"));
    expect(await getPlaceBySlug("angkor-wat")).toBeNull();
  });
});
