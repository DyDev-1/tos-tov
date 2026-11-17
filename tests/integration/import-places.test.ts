import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { adminActions, photos, places, posts, users } from "@/db/schema";
import { runImport } from "@/db/import-places";
import { getPlaceBySlug } from "@/lib/services/places";
import { createTestAdmin, createTestUser, db, resetAndSeedPlaces } from "../support/db";
import { IMPORT_COLUMNS } from "@/db/import-places";

// Build a small CSV from objects (missing columns are left empty).
function csv(rows: Record<string, string>[]): string {
  const cell = (v = "") => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [IMPORT_COLUMNS.join(","), ...rows.map((r) => IMPORT_COLUMNS.map((c) => cell(r[c])).join(","))].join("\n");
}
const pond = (extra: Record<string, string> = {}) => ({
  slug: "hidden-pond", name_en: "Hidden Pond", name_km: "បឹងលាក់ខ្លួន", province: "Pursat", category: "waterfalls",
  lat: "12.5", lng: "103.9", best_months: "Jul-Oct", ...extra,
});
const lake = (extra: Record<string, string> = {}) => ({
  slug: "quiet-lake", name_en: "Quiet Lake", name_km: "បឹងស្ងាត់", province: "takeo", category: "Beaches",
  lat: "10.9", lng: "104.8", best_months: "11 12", ...extra,
});
const count = async () => (await db.select().from(places)).length;

beforeEach(resetAndSeedPlaces);

describe("importing places", () => {
  it("adds the places, published, and they show up on the site", async () => {
    const report = await runImport(db, csv([pond({ tagline_en: "A quiet pond", entry_fee_usd: "2.5", ticket_en: "Pay at the gate", ticket_km: "បង់នៅច្រកចូល", avoid_months: "3" }), lake()]), "csv");
    expect(report.problems).toEqual([]);
    expect(report).toMatchObject({ created: ["hidden-pond", "quiet-lake"], updated: [], skipped: [], written: true });

    const place = (await getPlaceBySlug("hidden-pond"))!;
    expect(place).toMatchObject({
      name: { en: "Hidden Pond", km: "បឹងលាក់ខ្លួន" },
      tagline: { en: "A quiet pond", km: null },
      province: { slug: "pursat" },
      category: { slug: "waterfalls" },
      bestMonths: [7, 8, 9, 10],
      avoidMonths: [3],
      entryFee: { khr: null, usd: 2.5 },
      details: { ticket: { en: "Pay at the gate", km: "បង់នៅច្រកចូល" } },
    });
    expect(place.location.lat).toBeCloseTo(12.5, 4);
    expect(place.location.lng).toBeCloseTo(103.9, 4);
  });

  it("understands a province or category written as a name, in any letter case", async () => {
    await runImport(db, csv([lake()]), "csv");
    const place = (await getPlaceBySlug("quiet-lake"))!;
    expect(place.province.slug).toBe("takeo");
    expect(place.category.slug).toBe("beaches");
  });

  it("reads JSON too", async () => {
    const report = await runImport(db, JSON.stringify([{ name_en: "Json Falls", name_km: "ក", province: "kampot", category: "waterfalls", lat: 10.6, lng: 104.1, best_months: [1, 2] }]), "json");
    expect(report.problems).toEqual([]);
    expect((await getPlaceBySlug("json-falls"))!.bestMonths).toEqual([1, 2]);
  });

  it("is safe to run twice: the second time adds nothing and skips what exists", async () => {
    await runImport(db, csv([pond()]), "csv");
    const again = await runImport(db, csv([pond(), lake()]), "csv");
    expect(again).toMatchObject({ created: ["quiet-lake"], skipped: ["hidden-pond"], updated: [] });
    expect(await count()).toBe(10);
  });

  it("leaves existing places alone unless asked to update, and then changes them", async () => {
    await runImport(db, csv([pond()]), "csv");
    await runImport(db, csv([pond({ name_en: "Renamed Pond" })]), "csv");
    expect((await getPlaceBySlug("hidden-pond"))!.name.en).toBe("Hidden Pond");

    const update = await runImport(db, csv([pond({ name_en: "Renamed Pond" })]), "csv", { update: true });
    expect(update).toMatchObject({ created: [], updated: ["hidden-pond"] });
    expect((await getPlaceBySlug("hidden-pond"))!.name.en).toBe("Renamed Pond");
  });

  it("never touches likes, comments or posts when it updates a place", async () => {
    await runImport(db, csv([pond()]), "csv");
    const [row] = await db.update(places).set({ likesCount: 42 }).where(eq(places.slug, "hidden-pond")).returning();
    await runImport(db, csv([pond({ name_en: "Renamed" })]), "csv", { update: true });
    const [after] = await db.select().from(places).where(eq(places.id, row.id));
    expect(after.likesCount).toBe(42);
  });

  it("can add places as waiting for approval", async () => {
    await runImport(db, csv([pond()]), "csv", { pending: true });
    expect(await getPlaceBySlug("hidden-pond")).toBeNull();
    const [row] = await db.select().from(places).where(eq(places.slug, "hidden-pond"));
    expect(row.status).toBe("pending");
  });
});

describe("checking before writing", () => {
  it("a dry run reports what it would do and writes nothing", async () => {
    const report = await runImport(db, csv([pond(), lake()]), "csv", { dryRun: true });
    expect(report).toMatchObject({ created: ["hidden-pond", "quiet-lake"], written: false, problems: [] });
    expect(await count()).toBe(8);
  });

  it("writes NOTHING when any row has a problem, even though the other rows are fine", async () => {
    const report = await runImport(db, csv([pond(), lake({ lat: "999" }), pond({ slug: "third", name_en: "Third", lat: "12.9" })]), "csv");
    expect(report.written).toBe(false);
    expect(report.problems).toEqual([expect.objectContaining({ line: 3, column: "lat" })]);
    expect(await count()).toBe(8);
    expect(await getPlaceBySlug("hidden-pond")).toBeNull();
  });

  it("reports an unknown province and category with their rows", async () => {
    const report = await runImport(db, csv([pond({ province: "Atlantis" }), lake({ category: "casinos" })]), "csv");
    expect(report.written).toBe(false);
    expect(report.problems).toEqual([
      expect.objectContaining({ line: 2, column: "province", message: expect.stringContaining("Atlantis") }),
      expect.objectContaining({ line: 3, column: "category", message: expect.stringContaining("casinos") }),
    ]);
    expect(await count()).toBe(8);
  });

  it("reports file problems and database problems together", async () => {
    const report = await runImport(db, csv([pond({ province: "Atlantis" }), lake({ best_months: "zzz" })]), "csv");
    // One run lists both kinds, so the person can fix everything in one go.
    expect(report.problems.map((p) => `${p.line}:${p.column}`).sort()).toEqual(["2:province", "3:best_months"]);
    expect(report.written).toBe(false);
    expect(await count()).toBe(8);
  });

  it("refuses a file that is empty or not readable", async () => {
    expect((await runImport(db, "", "csv")).problems).toHaveLength(1);
    expect((await runImport(db, "[oops", "json")).problems).toHaveLength(1);
    expect(await count()).toBe(8);
  });
});

describe("warnings about likely duplicates", () => {
  it("warns about a new place within 150 m of one we already have, but still adds it", async () => {
    const report = await runImport(db, csv([pond({ slug: "angkor-gate", name_en: "Angkor Gate", lat: "13.4126", lng: "103.8671", province: "Siem Reap", category: "temples" })]), "csv");
    expect(report.written).toBe(true);
    expect(report.notes).toEqual([expect.objectContaining({ line: 2, message: expect.stringContaining("angkor-wat") })]);
  });

  it("warns about two rows of the file that are within 150 m of each other", async () => {
    const report = await runImport(db, csv([pond(), pond({ slug: "other-pond", name_en: "Other Pond", lat: "12.5003" })]), "csv", { dryRun: true });
    expect(report.notes).toEqual([expect.objectContaining({ line: 3, message: expect.stringContaining("line 2") })]);
  });

  it("does not warn about an existing place that is being skipped", async () => {
    await runImport(db, csv([pond()]), "csv");
    const again = await runImport(db, csv([pond()]), "csv");
    expect(again.notes).toEqual([]);
  });
});

describe("photos", () => {
  const options = { photoBase: "https://photos.example.com" };

  it("saves photo addresses in order, from our storage only", async () => {
    await runImport(db, csv([pond({ photo_urls: "https://photos.example.com/a.webp https://photos.example.com/b.webp" })]), "csv", options);
    const place = (await getPlaceBySlug("hidden-pond"))!;
    expect(place.photos.map((p) => p.url)).toEqual(["https://photos.example.com/a.webp", "https://photos.example.com/b.webp"]);
  });

  it("an update replaces the place's own photos but keeps photos from users' posts", async () => {
    await runImport(db, csv([pond({ photo_urls: "https://photos.example.com/old.webp" })]), "csv", options);
    const [place] = await db.select().from(places).where(eq(places.slug, "hidden-pond"));
    const user = await createTestUser();
    const [post] = await db.insert(posts).values({ placeId: place.id, userId: user.id, story: "A post with a photo.", rating: 5, visitedAt: "2026-11-01", status: "published" }).returning();
    await db.insert(photos).values({ placeId: place.id, postId: post.id, url: "https://photos.example.com/from-post.webp" });

    await runImport(db, csv([pond({ photo_urls: "https://photos.example.com/new.webp" })]), "csv", { ...options, update: true });
    const urls = (await db.select().from(photos).where(eq(photos.placeId, place.id))).map((p) => p.url).sort();
    expect(urls).toEqual(["https://photos.example.com/from-post.webp", "https://photos.example.com/new.webp"]);
  });
});

describe("who imported", () => {
  it("records the admin as the author and writes one line in the activity log", async () => {
    const admin = await createTestAdmin("Dara Admin");
    await runImport(db, csv([pond(), lake()]), "csv", { adminId: admin.id });
    const [row] = await db.select().from(places).where(eq(places.slug, "hidden-pond"));
    expect(row.createdById).toBe(admin.id);
    expect((await getPlaceBySlug("hidden-pond"))!.addedBy).toBe("Dara Admin");
    const log = await db.select().from(adminActions);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ adminId: admin.id, action: "place.import", details: { created: 2, updated: 0, skipped: 0 } });
  });

  it("writes no log line when nothing was written", async () => {
    const admin = await createTestAdmin();
    await runImport(db, csv([pond()]), "csv", { adminId: admin.id });
    await runImport(db, csv([pond()]), "csv", { adminId: admin.id }); // skipped
    await runImport(db, csv([lake({ lat: "x" })]), "csv", { adminId: admin.id }); // problem
    expect(await db.select().from(adminActions)).toHaveLength(1);
    void users;
  });
});
