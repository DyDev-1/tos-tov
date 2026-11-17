import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { adminActions, categories, comments, guides, likes, photos, places, posts, reports, saves, users } from "@/db/schema";
import {
  banUser,
  createCategory,
  createGuide,
  deleteCategory,
  deleteGuide,
  deletePhoto,
  getAdminOverview,
  getAdminPlace,
  listAdminCategories,
  listAdminComments,
  listAdminPlaces,
  listAdminPosts,
  listAdminReports,
  listAdminUsers,
  listAuditLog,
  mergePlaces,
  resolveMergedPlaceSlug,
  resolveReport,
  setCommentStatus,
  setPlaceStatus,
  setPostStatus,
  unbanUser,
  updateCategory,
  updateGuide,
  updatePlace,
} from "@/lib/services/admin";
import { getPlaceBySlug } from "@/lib/services/places";
import { listComments } from "@/lib/services/engagement";
import { listPosts } from "@/lib/services/posts";
import { guideInputSchema } from "@/lib/validation/admin";
import { createTestAdmin, createTestUser, db, resetAndSeedPlaces } from "../support/db";

const idOf = async (slug: string) => (await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)))[0].id;
const actions = async () => (await db.select().from(adminActions).orderBy(adminActions.id)).map((a) => a.action);
const list = { limit: 50, offset: 0 };

let admin: Awaited<ReturnType<typeof createTestAdmin>>;
beforeEach(async () => {
  await resetAndSeedPlaces();
  admin = await createTestAdmin("Dara Admin");
});

describe("overview", () => {
  it("counts what waits for an admin", async () => {
    const user = await createTestUser();
    await db.update(places).set({ status: "pending" }).where(eq(places.slug, "angkor-wat"));
    await db.insert(posts).values({ placeId: await idOf("kep-crab-market"), userId: user.id, story: "A pending post here.", rating: 4, visitedAt: "2026-11-01" });
    await db.insert(reports).values({ placeId: await idOf("kampot".length ? "kep-crab-market" : ""), userId: user.id, reason: "closed" });
    await db.update(users).set({ bannedAt: new Date() }).where(eq(users.id, user.id));

    expect(await getAdminOverview()).toEqual({ pendingPlaces: 1, pendingPosts: 1, openReports: 1, totalPlaces: 7, totalUsers: 8, bannedUsers: 1 });
  });
});

describe("places", () => {
  it("lists places of any status and filters by status and search", async () => {
    await db.update(places).set({ status: "pending" }).where(eq(places.slug, "angkor-wat"));
    await db.update(places).set({ status: "hidden" }).where(eq(places.slug, "phnom-kulen"));
    expect((await listAdminPlaces(list)).total).toBe(8);
    expect((await listAdminPlaces({ ...list, status: "pending" })).items.map((p) => p.slug)).toEqual(["angkor-wat"]);
    expect((await listAdminPlaces({ ...list, status: "hidden" })).items.map((p) => p.slug)).toEqual(["phnom-kulen"]);
    expect((await listAdminPlaces({ ...list, q: "BOU sra" })).items.map((p) => p.slug)).toEqual(["bou-sra-waterfall"]);
    expect((await listAdminPlaces({ ...list, q: "អង្គរ" })).items.map((p) => p.slug)).toEqual(["angkor-wat"]);
  });

  it("treats % and _ in the search as normal characters", async () => {
    expect((await listAdminPlaces({ ...list, q: "%" })).items).toEqual([]);
  });

  it("shows only the fields an admin shape allows", async () => {
    const { items } = await listAdminPlaces({ ...list, q: "kep" });
    expect(Object.keys(items[0]).sort()).toEqual(["addedBy", "category", "createdAt", "id", "mergedInto", "name", "province", "slug", "status"]);
  });

  it("approves a pending place so it becomes public, and logs it", async () => {
    const id = await idOf("angkor-wat");
    await db.update(places).set({ status: "pending" }).where(eq(places.id, id));
    expect(await getPlaceBySlug("angkor-wat")).toBeNull();

    expect(await setPlaceStatus(admin, id, "published")).toEqual({ ok: true });
    expect(await getPlaceBySlug("angkor-wat")).not.toBeNull();
    expect(await actions()).toEqual(["place.approve"]);
  });

  it("hides a place and brings it back", async () => {
    const id = await idOf("angkor-wat");
    await setPlaceStatus(admin, id, "hidden");
    expect(await getPlaceBySlug("angkor-wat")).toBeNull();
    await setPlaceStatus(admin, id, "published");
    expect(await getPlaceBySlug("angkor-wat")).not.toBeNull();
    expect(await actions()).toEqual(["place.hide", "place.unhide"]);
  });

  it("edits a place: names, province, category, pin, fees and months", async () => {
    const id = await idOf("kep-crab-market");
    const result = await updatePlace(admin, id, {
      nameEn: "Kep Crab Market (new)",
      provinceSlug: "kampot",
      categorySlug: "temples",
      lat: 10.5,
      lng: 104.3,
      entryFeeKhr: 0,
      entryFeeUsd: 1.5,
      bestMonths: [12, 1, 12],
      details: { ticket: { en: "Free" } },
    });
    expect(result).toEqual({ ok: true });

    const place = (await getAdminPlace(id))!;
    expect(place.name.en).toBe("Kep Crab Market (new)");
    expect(place.province.slug).toBe("kampot");
    expect(place.category.slug).toBe("temples");
    expect(place.location.lat).toBeCloseTo(10.5, 4);
    expect(place.location.lng).toBeCloseTo(104.3, 4);
    expect(place.entryFee).toEqual({ khr: 0, usd: 1.5 });
    expect(place.details).toEqual({ ticket: { en: "Free" } });
    expect(await actions()).toEqual(["place.update"]);
    const [entry] = await db.select().from(adminActions);
    expect(entry.details).toEqual({ fields: expect.arrayContaining(["nameEn", "provinceSlug", "lat"]) });
  });

  it("refuses an unknown province or category and changes nothing", async () => {
    const id = await idOf("kep-crab-market");
    expect(await updatePlace(admin, id, { provinceSlug: "atlantis" })).toEqual({ ok: false, reason: "invalid_reference" });
    expect(await updatePlace(admin, id, { nameEn: "X", categorySlug: "casinos" })).toEqual({ ok: false, reason: "invalid_reference" });
    expect((await getAdminPlace(id))!.name.en).toBe("Kep Crab Market");
    expect(await actions()).toEqual([]);
  });

  it("can clear optional fields", async () => {
    const id = await idOf("bou-sra-waterfall");
    await updatePlace(admin, id, { taglineEn: null, entryFeeUsd: null });
    expect((await getAdminPlace(id))!.tagline.en).toBeNull();
  });

  it("reports an unknown place without writing a log line", async () => {
    expect(await setPlaceStatus(admin, 99999, "hidden")).toEqual({ ok: false, reason: "not_found" });
    expect(await updatePlace(admin, 99999, { nameEn: "X" })).toEqual({ ok: false, reason: "not_found" });
    expect(await actions()).toEqual([]);
  });

  it("gives the edit form everything, including guides and photos", async () => {
    const place = (await getAdminPlace(await idOf("bou-sra-waterfall")))!;
    expect(place.guides).toHaveLength(2);
    expect(place.status).toBe("published");
    expect(place.details.ticket?.en).toContain("Pay at the gate");
    expect(await getAdminPlace(99999)).toBeNull();
  });
});

describe("merging places", () => {
  async function setup() {
    const dup = await idOf("kep-crab-market");
    const target = await idOf("long-set-beach");
    const [a, b, c] = [await createTestUser("A"), await createTestUser("B"), await createTestUser("C")];
    await db.insert(photos).values({ placeId: dup, url: "https://photos.example.com/dup.webp" });
    await db.insert(posts).values({ placeId: dup, userId: a.id, story: "Post on the duplicate.", rating: 4, visitedAt: "2026-11-01", status: "published" });
    await db.insert(comments).values({ placeId: dup, userId: a.id, body: "Comment on the duplicate" });
    await db.insert(guides).values({ placeId: dup, name: "Guide D", tourEn: "t", tourKm: "t", contactType: "phone", contactValue: "+855 12 345 678" });
    await db.insert(reports).values({ placeId: dup, userId: b.id, reason: "duplicate" });
    // A and B liked the duplicate; B and C liked the target. B did both.
    await db.insert(likes).values([{ placeId: dup, userId: a.id }, { placeId: dup, userId: b.id }, { placeId: target, userId: b.id }, { placeId: target, userId: c.id }]);
    await db.insert(saves).values([{ placeId: dup, userId: a.id }, { placeId: dup, userId: b.id }, { placeId: target, userId: b.id }]);
    await db.update(places).set({ likesCount: 4 }).where(eq(places.id, dup));
    await db.update(places).set({ likesCount: 10 }).where(eq(places.id, target));
    return { dup, target, a, b };
  }

  it("moves everything to the place that stays", async () => {
    const { dup, target } = await setup();
    expect(await mergePlaces(admin, dup, target)).toEqual({ ok: true });

    for (const table of [photos, posts, comments, guides, reports]) {
      expect(await db.select().from(table).where(eq(table.placeId, dup))).toEqual([]);
    }
    expect((await db.select().from(photos).where(eq(photos.placeId, target))).map((p) => p.url)).toContain("https://photos.example.com/dup.webp");
    expect((await db.select().from(guides).where(eq(guides.placeId, target))).map((g) => g.name)).toContain("Guide D");
    expect((await listPosts("long-set-beach", { limit: 10, offset: 0 }))!.items.map((p) => p.story)).toContain("Post on the duplicate.");
  });

  it("keeps one like and one save per person and a fair like count", async () => {
    const { dup, target } = await setup();
    await mergePlaces(admin, dup, target);

    expect((await db.select().from(likes).where(eq(likes.placeId, target))).length).toBe(3); // A, B, C
    expect((await db.select().from(saves).where(eq(saves.placeId, target))).length).toBe(2); // A, B
    expect(await db.select().from(likes).where(eq(likes.placeId, dup))).toEqual([]);
    // 10 + 4 - 1 person who liked both
    const [row] = await db.select({ n: places.likesCount }).from(places).where(eq(places.id, target));
    expect(row.n).toBe(13);
  });

  it("hides the duplicate, remembers where it went, and sends its old address to the place that stays", async () => {
    const { dup, target } = await setup();
    await mergePlaces(admin, dup, target);
    const [row] = await db.select().from(places).where(eq(places.id, dup));
    expect(row).toMatchObject({ status: "hidden", parentPlaceId: target, likesCount: 0 });
    expect(await getPlaceBySlug("kep-crab-market")).toBeNull();
    expect(await resolveMergedPlaceSlug("kep-crab-market")).toBe("long-set-beach");
    expect(await resolveMergedPlaceSlug("long-set-beach")).toBeNull();
    expect(await resolveMergedPlaceSlug("never-existed")).toBeNull();
    expect(await actions()).toEqual(["place.merge"]);
    expect((await db.select().from(adminActions))[0].details).toEqual({ mergedId: dup, mergedSlug: "kep-crab-market" });
  });

  it("follows a chain when the place that stayed is merged later", async () => {
    const a = await idOf("kep-crab-market");
    const b = await idOf("long-set-beach");
    const c = await idOf("lazy-beach-koh-rong-sanloem");
    await mergePlaces(admin, a, b);
    await mergePlaces(admin, b, c);
    expect(await resolveMergedPlaceSlug("kep-crab-market")).toBe("lazy-beach-koh-rong-sanloem");
  });

  it("refuses wrong merges and changes nothing", async () => {
    const a = await idOf("kep-crab-market");
    const b = await idOf("long-set-beach");
    expect(await mergePlaces(admin, a, a)).toEqual({ ok: false, reason: "same_place" });
    expect(await mergePlaces(admin, a, 99999)).toEqual({ ok: false, reason: "not_found" });
    await mergePlaces(admin, a, b);
    expect(await mergePlaces(admin, a, await idOf("angkor-wat"))).toEqual({ ok: false, reason: "already_merged" });
    expect(await mergePlaces(admin, await idOf("angkor-wat"), a)).toEqual({ ok: false, reason: "target_unavailable" });
    await db.update(places).set({ status: "hidden" }).where(eq(places.id, await idOf("phnom-kulen")));
    expect(await mergePlaces(admin, await idOf("angkor-wat"), await idOf("phnom-kulen"))).toEqual({ ok: false, reason: "target_unavailable" });
    expect(await actions()).toEqual(["place.merge"]);
  });
});

describe("guides and photos", () => {
  const input = { name: "Sophea", tourEn: "Day trip", tourKm: "ដំណើរមួយថ្ងៃ", priceText: "$25", contactType: "telegram" as const, contactValue: "sophea_guide" };

  it("adds, edits and removes a guide, with a log line each time", async () => {
    const placeId = await idOf("angkor-wat");
    const created = await createGuide(admin, placeId, guideInputSchema.parse(input));
    expect(created).toMatchObject({ ok: true, value: { id: expect.any(Number) } });
    const id = (created as { value: { id: number } }).value.id;
    expect((await getAdminPlace(placeId))!.guides.map((g) => g.name)).toEqual(["Sophea"]);

    expect(await updateGuide(admin, id, guideInputSchema.parse({ ...input, name: "Sophea K." }))).toEqual({ ok: true });
    expect((await getAdminPlace(placeId))!.guides[0].name).toBe("Sophea K.");

    expect(await deleteGuide(admin, id)).toEqual({ ok: true });
    expect((await getAdminPlace(placeId))!.guides).toEqual([]);
    expect(await actions()).toEqual(["guide.create", "guide.update", "guide.delete"]);
  });

  it("reports unknown guides and places", async () => {
    expect(await createGuide(admin, 99999, guideInputSchema.parse(input))).toEqual({ ok: false, reason: "not_found" });
    expect(await updateGuide(admin, 99999, guideInputSchema.parse(input))).toEqual({ ok: false, reason: "not_found" });
    expect(await deleteGuide(admin, 99999)).toEqual({ ok: false, reason: "not_found" });
  });

  it("checks Telegram usernames and phone numbers", () => {
    expect(guideInputSchema.safeParse({ ...input, contactValue: "@sophea_guide" }).success).toBe(false);
    expect(guideInputSchema.safeParse({ ...input, contactValue: "ab" }).success).toBe(false);
    expect(guideInputSchema.safeParse({ ...input, contactType: "phone", contactValue: "+855 12 345 678" }).success).toBe(true);
    expect(guideInputSchema.safeParse({ ...input, contactType: "phone", contactValue: "call me" }).success).toBe(false);
  });

  it("removes a photo", async () => {
    const placeId = await idOf("angkor-wat");
    const [photo] = await db.insert(photos).values({ placeId, url: "https://photos.example.com/x.webp" }).returning();
    expect(await deletePhoto(admin, photo.id)).toEqual({ ok: true });
    expect((await getPlaceBySlug("angkor-wat"))!.photos).toEqual([]);
    expect(await deletePhoto(admin, photo.id)).toEqual({ ok: false, reason: "not_found" });
    expect(await actions()).toEqual(["photo.delete"]);
  });
});

describe("posts, comments and reports", () => {
  it("approves a pending post so it becomes public, and can hide it again", async () => {
    const user = await createTestUser();
    const placeId = await idOf("kep-crab-market");
    const [post] = await db.insert(posts).values({ placeId, userId: user.id, story: "Waiting for approval.", rating: 3, visitedAt: "2026-11-01" }).returning();

    expect((await listAdminPosts({ ...list, status: "pending" })).items.map((p) => p.id)).toEqual([post.id]);
    expect((await listPosts("kep-crab-market", { limit: 5, offset: 0 }))!.total).toBe(0);

    await setPostStatus(admin, post.id, "published");
    expect((await listPosts("kep-crab-market", { limit: 5, offset: 0 }))!.total).toBe(1);
    await setPostStatus(admin, post.id, "hidden");
    expect((await listPosts("kep-crab-market", { limit: 5, offset: 0 }))!.total).toBe(0);
    expect(await actions()).toEqual(["post.approve", "post.hide"]);
    expect(await setPostStatus(admin, 99999, "hidden")).toEqual({ ok: false, reason: "not_found" });
  });

  it("shows the post's author and place to the admin", async () => {
    const { items } = await listAdminPosts(list);
    expect(items[0]).toMatchObject({ author: { id: expect.any(Number), name: expect.any(String) }, place: { slug: expect.any(String) } });
  });

  it("hides and restores a comment", async () => {
    const [{ id }] = await db.select({ id: comments.id }).from(comments).limit(1);
    await setCommentStatus(admin, id, "hidden");
    expect((await listComments("bou-sra-waterfall", { limit: 10, offset: 0 }))!.total).toBe(1);
    expect((await listAdminComments({ ...list, status: "hidden" })).items.map((c) => c.id)).toEqual([id]);
    await setCommentStatus(admin, id, "published");
    expect((await listComments("bou-sra-waterfall", { limit: 10, offset: 0 }))!.total).toBe(2);
    expect(await actions()).toEqual(["comment.hide", "comment.restore"]);
    expect(await setCommentStatus(admin, 99999, "hidden")).toEqual({ ok: false, reason: "not_found" });
  });

  it("lists open reports with the place and resolves them", async () => {
    const user = await createTestUser("Reporter");
    const placeId = await idOf("angkor-wat");
    const [report] = await db.insert(reports).values({ placeId, userId: user.id, reason: "unsafe", message: "Loose rocks" }).returning();

    const open = await listAdminReports({ ...list, status: "open" });
    expect(open.items[0]).toMatchObject({ id: report.id, reason: "unsafe", message: "Loose rocks", reporter: { name: "Reporter" }, place: { slug: "angkor-wat" } });

    expect(await resolveReport(admin, report.id)).toEqual({ ok: true });
    expect((await listAdminReports({ ...list, status: "open" })).total).toBe(0);
    expect((await listAdminReports({ ...list, status: "resolved" })).total).toBe(1);
    expect(await actions()).toEqual(["report.resolve"]);
    expect(await resolveReport(admin, 99999)).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("categories", () => {
  it("lists categories with how many places use each", async () => {
    const all = await listAdminCategories();
    expect(all.map((c) => c.slug)).toEqual(["temples", "waterfalls", "beaches", "mountains", "food"]);
    expect(Object.fromEntries(all.map((c) => [c.slug, c.placeCount]))).toEqual({ temples: 2, waterfalls: 2, beaches: 2, mountains: 1, food: 1 });
  });

  it("adds a category at the end of the list", async () => {
    const result = await createCategory(admin, { slug: "markets", nameEn: "Markets", nameKm: "ផ្សារ" });
    expect(result.ok).toBe(true);
    const all = await listAdminCategories();
    expect(all.at(-1)).toMatchObject({ slug: "markets", sortOrder: 6, placeCount: 0 });
  });

  it("refuses a web name that is already used", async () => {
    expect(await createCategory(admin, { slug: "food", nameEn: "Food 2", nameKm: "អាហារ" })).toEqual({ ok: false, reason: "slug_taken" });
    const markets = (await createCategory(admin, { slug: "markets", nameEn: "M", nameKm: "ផ" })) as { value: { id: number } };
    expect(await updateCategory(admin, markets.value.id, { slug: "food" })).toEqual({ ok: false, reason: "slug_taken" });
  });

  it("edits names and order, and lets a category keep its own web name", async () => {
    const [{ id }] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, "food"));
    expect(await updateCategory(admin, id, { slug: "food", nameEn: "Food and drink", sortOrder: 0 })).toEqual({ ok: true });
    const all = await listAdminCategories();
    expect(all[0]).toMatchObject({ slug: "food", name: { en: "Food and drink" } });
    expect(await updateCategory(admin, 99999, { nameEn: "X" })).toEqual({ ok: false, reason: "not_found" });
  });

  it("will not delete a category that still has places, but deletes an empty one", async () => {
    const [{ id: used }] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, "temples"));
    expect(await deleteCategory(admin, used)).toEqual({ ok: false, reason: "in_use" });
    const empty = (await createCategory(admin, { slug: "markets", nameEn: "M", nameKm: "ផ" })) as { value: { id: number } };
    expect(await deleteCategory(admin, empty.value.id)).toEqual({ ok: true });
    expect((await listAdminCategories()).map((c) => c.slug)).not.toContain("markets");
    expect(await deleteCategory(admin, 99999)).toEqual({ ok: false, reason: "not_found" });
    expect(await actions()).toEqual(["category.create", "category.delete"]);
  });
});

describe("users", () => {
  it("lists people with their email and role, and searches by name or email", async () => {
    await db.insert(users).values({ clerkId: "test:sok", name: "Sok Dara", email: "sok@example.com" });
    expect((await listAdminUsers({ ...list, q: "sok@example" })).items.map((u) => u.name)).toEqual(["Sok Dara"]);
    expect((await listAdminUsers({ ...list, q: "dara admin" })).items[0].role).toBe("admin");
  });

  it("does not show Clerk ids or other internals", async () => {
    const { items } = await listAdminUsers(list);
    expect(Object.keys(items[0]).sort()).toEqual(["bannedAt", "bannedReason", "createdAt", "email", "id", "name", "role"]);
  });

  it("bans and unbans a person, with a reason in the log", async () => {
    const user = await createTestUser("Troll");
    expect(await banUser(admin, user.id, "Posting spam")).toEqual({ ok: true });
    const banned = (await listAdminUsers({ ...list, status: "banned" })).items;
    expect(banned).toMatchObject([{ id: user.id, bannedReason: "Posting spam" }]);
    expect(banned[0].bannedAt).toBeTruthy();

    expect(await unbanUser(admin, user.id)).toEqual({ ok: true });
    expect((await listAdminUsers({ ...list, status: "banned" })).items).toEqual([]);
    expect(await actions()).toEqual(["user.ban", "user.unban"]);
    expect((await db.select().from(adminActions))[0].details).toEqual({ reason: "Posting spam" });
  });

  it("will not ban an admin, yourself, or someone twice", async () => {
    const user = await createTestUser();
    const other = await createTestAdmin("Other admin");
    expect(await banUser(admin, other.id, "No reason")).toEqual({ ok: false, reason: "cannot_ban_admin" });
    expect(await banUser(admin, admin.id, "No reason")).toEqual({ ok: false, reason: "cannot_ban_yourself" });
    await banUser(admin, user.id, "First time");
    expect(await banUser(admin, user.id, "Second time")).toEqual({ ok: false, reason: "already_banned" });
    expect(await banUser(admin, 99999, "No one")).toEqual({ ok: false, reason: "not_found" });
    expect(await unbanUser(admin, other.id)).toEqual({ ok: false, reason: "not_banned" });
    expect(await unbanUser(admin, 99999)).toEqual({ ok: false, reason: "not_found" });
    expect(await actions()).toEqual(["user.ban"]);
  });
});

describe("audit log", () => {
  it("records who did what, newest first", async () => {
    const other = await createTestAdmin("Second Admin");
    await setPlaceStatus(admin, await idOf("angkor-wat"), "hidden");
    await setPlaceStatus(other, await idOf("angkor-wat"), "published");

    const { items, total } = await listAuditLog({ limit: 10, offset: 0 });
    expect(total).toBe(2);
    expect(items.map((i) => `${i.admin.name}: ${i.action}`)).toEqual(["Second Admin: place.unhide", "Dara Admin: place.hide"]);
    expect(items[0]).toMatchObject({ target: { type: "place", id: expect.any(Number) }, details: { from: "hidden", to: "published" } });
  });

  it("can show the history of one thing", async () => {
    const id = await idOf("angkor-wat");
    await setPlaceStatus(admin, id, "hidden");
    await setPlaceStatus(admin, await idOf("phnom-kulen"), "hidden");
    expect((await listAuditLog({ limit: 10, offset: 0, targetType: "place", targetId: id })).total).toBe(1);
  });

  it("pages through entries", async () => {
    for (const slug of ["angkor-wat", "phnom-kulen", "kep-crab-market"]) await setPlaceStatus(admin, await idOf(slug), "hidden");
    expect((await listAuditLog({ limit: 2, offset: 2 })).items).toHaveLength(1);
  });

  it("writes no log line when the change fails", async () => {
    await setPlaceStatus(admin, 99999, "hidden");
    await banUser(admin, admin.id, "No reason");
    expect((await listAuditLog({ limit: 10, offset: 0 })).total).toBe(0);
  });
});
