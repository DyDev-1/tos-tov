import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getNearby } from "@/app/api/v1/places/nearby/route";
import { POST as postPlace } from "@/app/api/v1/places/route";
import { POST as postUpload } from "@/app/api/v1/uploads/image/route";
import { photos, places, users, type UserRow } from "@/db/schema";
import * as auth from "@/lib/auth";
import { createPlace } from "@/lib/services/place-submissions";
import { getPlaceBySlug, listNearbyPlaces } from "@/lib/services/places";
import { createPlaceInputSchema, type CreatePlaceInput } from "@/lib/validation/place-input";
import { createTestUser, db, resetAndSeedPlaces } from "../support/db";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(), requireAdmin: vi.fn() }));

const PHOTO_BASE = "https://photos.example.com";
const stubR2 = () => {
  vi.stubEnv("R2_ACCOUNT_ID", "acct");
  vi.stubEnv("R2_ACCESS_KEY_ID", "key");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
  vi.stubEnv("R2_BUCKET", "bucket");
  vi.stubEnv("R2_PUBLIC_URL", PHOTO_BASE);
};

// A place far from every sample place, so it is never a duplicate unless a test wants it to be.
const input = (change: Partial<CreatePlaceInput> = {}): CreatePlaceInput =>
  createPlaceInputSchema.parse({
    name: "Hidden Pond",
    provinceSlug: "pursat",
    categorySlug: "waterfalls",
    lat: 12.5,
    lng: 103.9,
    photos: [`${PHOTO_BASE}/places/1/pond.webp`],
    ...change,
  });

beforeEach(async () => {
  await resetAndSeedPlaces();
  stubR2();
});
afterEach(() => vi.unstubAllEnvs());

describe("listNearbyPlaces", () => {
  it("finds the sample place at its own spot and measures the distance", async () => {
    const found = await listNearbyPlaces({ lat: 13.4125, lng: 103.867, radiusMeters: 500, limit: 3 });
    expect(found).toHaveLength(1);
    expect(found[0].place.slug).toBe("angkor-wat");
    expect(found[0].distanceMeters).toBeLessThan(5);
  });

  it("orders by distance and respects the radius", async () => {
    const near = await listNearbyPlaces({ lat: 13.45, lng: 103.9, radiusMeters: 10_000, limit: 5 });
    expect(near.map((n) => n.place.slug)).toEqual(["angkor-wat"]);
    const wide = await listNearbyPlaces({ lat: 13.45, lng: 103.9, radiusMeters: 30_000, limit: 5 });
    expect(wide.map((n) => n.place.slug)).toEqual(["angkor-wat", "phnom-kulen"]);
    expect(wide[0].distanceMeters).toBeLessThan(wide[1].distanceMeters);
  });

  it("returns nothing in the middle of nowhere", async () => {
    expect(await listNearbyPlaces({ lat: 14.5, lng: 106, radiusMeters: 500, limit: 3 })).toEqual([]);
  });
});

describe("createPlace", () => {
  it("saves a pending place with its photos for a regular user", async () => {
    const user = await createTestUser("Sophea");
    const result = await createPlace(user, input({ photos: [`${PHOTO_BASE}/places/1/a.webp`, `${PHOTO_BASE}/places/1/b.webp`] }));
    expect(result).toMatchObject({ ok: true, place: { slug: "hidden-pond", status: "pending" } });

    const [row] = await db.select().from(places).where(eq(places.slug, "hidden-pond"));
    expect(row.createdById).toBe(user.id);
    const saved = await db.select().from(photos).where(eq(photos.placeId, row.id)).orderBy(photos.sortOrder);
    expect(saved.map((p) => p.url)).toEqual([`${PHOTO_BASE}/places/1/a.webp`, `${PHOTO_BASE}/places/1/b.webp`]);
  });

  it("keeps a pending place out of the public pages", async () => {
    const user = await createTestUser();
    await createPlace(user, input());
    expect(await getPlaceBySlug("hidden-pond")).toBeNull();
  });

  it("publishes at once when an admin adds it", async () => {
    const [admin] = await db.insert(users).values({ clerkId: "test:admin", name: "Admin", role: "admin" }).returning();
    const result = await createPlace(admin, input());
    expect(result).toMatchObject({ ok: true, place: { status: "published" } });
    expect(await getPlaceBySlug("hidden-pond")).not.toBeNull();
  });

  it("stores optional details in the right place", async () => {
    const user = await createTestUser();
    await createPlace(
      user,
      input({
        description: "A quiet pond",
        bestMonths: [10, 11],
        entryFeeKhr: 4000,
        entryFeeUsd: 2.5,
        whatToBring: "ស្បែកជើង និងទឹក",
      }),
    );
    const [row] = await db.select().from(places).where(eq(places.slug, "hidden-pond"));
    expect(row).toMatchObject({
      descriptionEn: "A quiet pond",
      descriptionKm: null,
      bestMonths: [10, 11],
      entryFeeKhr: 4000,
      entryFeeUsd: 2.5,
      details: { whatToBring: { km: "ស្បែកជើង និងទឹក" } },
    });
  });

  it("gives a Khmer-only name a safe web address", async () => {
    const user = await createTestUser();
    const result = await createPlace(user, input({ name: "បឹងស្រស់" }));
    expect(result).toMatchObject({ ok: true, place: { slug: "place" } });
    const second = await createPlace(user, input({ name: "បឹងស្អាត", lat: 12.6 }));
    expect(second).toMatchObject({ ok: true, place: { slug: "place-2" } });
  });

  it("keeps web addresses unique when two places share a name in different provinces", async () => {
    const user = await createTestUser();
    await createPlace(user, input());
    const second = await createPlace(user, input({ provinceSlug: "takeo", lat: 11, lng: 104.8 }));
    expect(second).toMatchObject({ ok: true, place: { slug: "hidden-pond-2" } });
  });

  it("offers an existing place that is at the same spot", async () => {
    const user = await createTestUser();
    const result = await createPlace(user, input({ name: "Another name", lat: 13.4126, lng: 103.8671 }));
    expect(result).toMatchObject({ ok: false, reason: "possible_duplicate", duplicate: { slug: "angkor-wat" } });
  });

  it("offers an existing place with the same name in the same province", async () => {
    const user = await createTestUser();
    const result = await createPlace(user, input({ name: "bou sra waterfall", provinceSlug: "mondulkiri" }));
    expect(result).toMatchObject({ ok: false, reason: "possible_duplicate", duplicate: { slug: "bou-sra-waterfall" } });
  });

  it("adds the place anyway when the person confirms it is different", async () => {
    const user = await createTestUser();
    const result = await createPlace(user, input({ name: "Angkor Wat Cafe", lat: 13.4126, lng: 103.8671, allowDuplicate: true }));
    expect(result.ok).toBe(true);
  });

  it("stops a person from adding more than 5 places an hour, but not an admin", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i++) {
      expect((await createPlace(user, input({ name: `Pond ${i}`, lat: 12.5 + i * 0.01 }))).ok).toBe(true);
    }
    expect(await createPlace(user, input({ name: "Pond 6", lat: 12.9 }))).toEqual({ ok: false, reason: "rate_limited" });

    const [admin] = await db.insert(users).values({ clerkId: "test:admin2", name: "Admin", role: "admin" }).returning();
    for (let i = 0; i < 6; i++) {
      expect((await createPlace(admin, input({ name: `Admin pond ${i}`, lat: 13 + i * 0.01 }))).ok).toBe(true);
    }
  });

  it("refuses photos that were not uploaded to our storage", async () => {
    const user = await createTestUser();
    expect(await createPlace(user, input({ photos: ["https://evil.example.org/x.webp"] }))).toEqual({ ok: false, reason: "invalid_photos" });
    expect(await createPlace(user, input({ photos: [`${PHOTO_BASE}.evil.org/x.webp`] }))).toEqual({ ok: false, reason: "invalid_photos" });
  });

  it("refuses all photos when storage is not set up", async () => {
    vi.unstubAllEnvs();
    const user = await createTestUser();
    expect(await createPlace(user, input())).toEqual({ ok: false, reason: "invalid_photos" });
  });

  it("refuses an unknown province or category", async () => {
    const user = await createTestUser();
    expect(await createPlace(user, input({ provinceSlug: "atlantis" }))).toEqual({ ok: false, reason: "invalid_reference" });
    expect(await createPlace(user, input({ categorySlug: "casinos" }))).toEqual({ ok: false, reason: "invalid_reference" });
  });
});

describe("POST /api/v1/places", () => {
  let user: UserRow;
  const body = (change: Record<string, unknown> = {}) => ({
    name: "Hidden Pond",
    provinceSlug: "pursat",
    categorySlug: "waterfalls",
    lat: 12.5,
    lng: 103.9,
    photos: [`${PHOTO_BASE}/places/1/pond.webp`],
    ...change,
  });
  const send = (payload: unknown) =>
    postPlace(new Request("http://localhost/api/v1/places", { method: "POST", body: JSON.stringify(payload) }));

  beforeEach(async () => {
    user = await createTestUser("Sophea");
    vi.mocked(auth.getCurrentUser).mockResolvedValue(user);
  });

  it("answers 401 when nobody is logged in", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    expect((await send(body())).status).toBe(401);
  });

  it("answers 201 with the new place", async () => {
    const res = await send(body());
    expect(res.status).toBe(201);
    expect((await res.json()).data).toEqual({ id: expect.any(Number), slug: "hidden-pond", status: "pending" });
  });

  it("answers 400 with the problem fields", async () => {
    const res = await send(body({ photos: [], lat: 1 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("invalid_body");
    expect(Object.keys(json.error.details)).toEqual(expect.arrayContaining(["photos", "lat"]));
  });

  it("answers 400 for a body that is not JSON", async () => {
    const res = await postPlace(new Request("http://localhost/api/v1/places", { method: "POST", body: "nope" }));
    expect(res.status).toBe(400);
  });

  it("answers 409 with the existing place, and lets the person go ahead", async () => {
    const duplicate = body({ name: "Different", lat: 13.4125, lng: 103.867 });
    const res = await send(duplicate);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatchObject({ code: "possible_duplicate", details: { slug: "angkor-wat" } });
    expect((await send({ ...duplicate, allowDuplicate: true })).status).toBe(201);
  });

  it("answers 429 after 5 places in an hour", async () => {
    for (let i = 0; i < 5; i++) await send(body({ name: `Pond ${i}`, lat: 12.5 + i * 0.01 }));
    const res = await send(body({ name: "Pond 6", lat: 12.95 }));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("rate_limited");
  });

  it("answers 400 for photos from somewhere else", async () => {
    const res = await send(body({ photos: ["https://evil.example.org/x.webp"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_photos");
  });
});

describe("GET /api/v1/places/nearby", () => {
  const call = (qs: string) => getNearby(new Request(`http://localhost/api/v1/places/nearby${qs}`));

  it("returns nearby places with distance", async () => {
    const res = await call("?lat=13.4125&lng=103.867&radius=300");
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data[0]).toMatchObject({ place: { slug: "angkor-wat" }, distanceMeters: expect.any(Number) });
  });

  it("answers 400 without a position", async () => {
    expect((await call("?radius=300")).status).toBe(400);
  });
});

describe("POST /api/v1/uploads/image", () => {
  const send = (payload: unknown) =>
    postUpload(new Request("http://localhost/api/v1/uploads/image", { method: "POST", body: JSON.stringify(payload) }));

  beforeEach(async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(await createTestUser());
  });

  it("answers 401 when nobody is logged in", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    expect((await send({ contentType: "image/webp", size: 1000 })).status).toBe(401);
  });

  it("gives a signed upload link", async () => {
    const res = await send({ contentType: "image/webp", size: 123_000 });
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.uploadUrl).toContain("X-Amz-Signature=");
    expect(data.publicUrl.startsWith(`${PHOTO_BASE}/places/`)).toBe(true);
  });

  it.each([
    ["a PDF", { contentType: "application/pdf", size: 1000 }],
    ["an SVG", { contentType: "image/svg+xml", size: 1000 }],
    ["a file over 10 MB", { contentType: "image/webp", size: 11 * 1024 * 1024 }],
    ["an empty file", { contentType: "image/webp", size: 0 }],
  ])("refuses %s", async (_name, payload) => {
    const res = await send(payload);
    expect(res.status).toBe(400);
  });

  it("answers 503 when photo storage is not set up", async () => {
    vi.unstubAllEnvs();
    const res = await send({ contentType: "image/webp", size: 1000 });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("uploads_not_configured");
  });
});
