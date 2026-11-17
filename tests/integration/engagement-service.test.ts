import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { comments, places, reports } from "@/db/schema";
import { addComment, createReport, getViewerState, listComments, setLike, setSave } from "@/lib/services/engagement";
import { listPlaces } from "@/lib/services/places";
import { ensureUser } from "@/lib/services/users";
import { listPlacesQuerySchema } from "@/lib/validation/places";
import { createTestUser, db, resetAndSeedPlaces } from "../support/db";

const SLUG = "bou-sra-waterfall";
const likesOf = async (slug: string) =>
  (await db.select({ n: places.likesCount }).from(places).where(eq(places.slug, slug)))[0].n;

describe("likes", () => {
  beforeEach(resetAndSeedPlaces);

  it("counts a like once, even if sent twice", async () => {
    const user = await createTestUser();
    const before = await likesOf(SLUG);
    await setLike(user.id, SLUG, true);
    const second = await setLike(user.id, SLUG, true);
    expect(second).toEqual({ liked: true, likesCount: before + 1 });
    expect(await likesOf(SLUG)).toBe(before + 1);
  });

  it("removes a like, and never goes below zero", async () => {
    const user = await createTestUser();
    const before = await likesOf(SLUG);
    await setLike(user.id, SLUG, true);
    expect((await setLike(user.id, SLUG, false))!.likesCount).toBe(before);
    await setLike(user.id, SLUG, false);
    expect(await likesOf(SLUG)).toBe(before);

    await db.update(places).set({ likesCount: 0 }).where(eq(places.slug, SLUG));
    await setLike(user.id, SLUG, false);
    expect(await likesOf(SLUG)).toBe(0);
  });

  it("returns null for a place that does not exist", async () => {
    const user = await createTestUser();
    expect(await setLike(user.id, "nope", true)).toBeNull();
  });

  it("reports what the person liked and saved", async () => {
    const user = await createTestUser();
    expect(await getViewerState(user.id, SLUG)).toEqual({ liked: false, saved: false });
    await setLike(user.id, SLUG, true);
    await setSave(user.id, SLUG, true);
    expect(await getViewerState(user.id, SLUG)).toEqual({ liked: true, saved: true });
    expect(await getViewerState(user.id, "nope")).toBeNull();
  });
});

describe("saves", () => {
  beforeEach(resetAndSeedPlaces);

  it("saves, repeats safely, and un-saves", async () => {
    const user = await createTestUser();
    await setSave(user.id, SLUG, true);
    await setSave(user.id, SLUG, true);
    const saved = await listPlaces(listPlacesQuerySchema.parse({}), { savedByUserId: user.id });
    expect(saved.items.map((p) => p.slug)).toEqual([SLUG]);

    await setSave(user.id, SLUG, false);
    const after = await listPlaces(listPlacesQuerySchema.parse({}), { savedByUserId: user.id });
    expect(after.total).toBe(0);
  });

  it("keeps each person's saved list private", async () => {
    const a = await createTestUser("A");
    const b = await createTestUser("B");
    await setSave(a.id, SLUG, true);
    const forB = await listPlaces(listPlacesQuerySchema.parse({}), { savedByUserId: b.id });
    expect(forB.total).toBe(0);
  });
});

describe("comments", () => {
  beforeEach(resetAndSeedPlaces);

  it("lists comments newest first with the author's name", async () => {
    const result = await listComments(SLUG, { limit: 20, offset: 0 });
    expect(result!.total).toBe(2);
    expect(result!.items.map((c) => c.author.name)).toEqual(["Vanna", "Emma"]);
  });

  it("adds a comment that shows up first", async () => {
    const user = await createTestUser("Sophea");
    const result = await addComment(user.id, SLUG, "Beautiful in the morning");
    expect(result).toMatchObject({ ok: true, comment: { body: "Beautiful in the morning", author: { name: "Sophea" } } });
    const list = await listComments(SLUG, { limit: 20, offset: 0 });
    expect(list!.items[0].body).toBe("Beautiful in the morning");
    expect(list!.total).toBe(3);
  });

  it("stops a person from posting more than 5 comments a minute", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i++) expect((await addComment(user.id, SLUG, `tip ${i}`)).ok).toBe(true);
    expect(await addComment(user.id, SLUG, "one too many")).toEqual({ ok: false, reason: "rate_limited" });
    // Another person is not affected.
    const other = await createTestUser("Other");
    expect((await addComment(other.id, SLUG, "hello")).ok).toBe(true);
  });

  it("does not list hidden comments", async () => {
    await db.update(comments).set({ status: "hidden" });
    expect((await listComments(SLUG, { limit: 20, offset: 0 }))!.items).toEqual([]);
  });

  it("returns not_found for an unknown place", async () => {
    const user = await createTestUser();
    expect(await addComment(user.id, "nope", "hi")).toEqual({ ok: false, reason: "not_found" });
    expect(await listComments("nope", { limit: 20, offset: 0 })).toBeNull();
  });

  it("pages through comments", async () => {
    const page = await listComments(SLUG, { limit: 1, offset: 1 });
    expect(page!.items).toHaveLength(1);
    expect(page!.total).toBe(2);
  });
});

describe("reports", () => {
  beforeEach(resetAndSeedPlaces);

  it("saves a report as open", async () => {
    const user = await createTestUser();
    const created = await createReport(user.id, SLUG, { reason: "closed", message: "Gate was locked" });
    expect(created).not.toBeNull();
    const [row] = await db.select().from(reports);
    expect(row).toMatchObject({ reason: "closed", message: "Gate was locked", status: "open" });
  });

  it("returns null for an unknown place", async () => {
    const user = await createTestUser();
    expect(await createReport(user.id, "nope", { reason: "other" })).toBeNull();
  });
});

describe("ensureUser", () => {
  beforeEach(resetAndSeedPlaces);

  it("creates the user once and asks Clerk for the name only the first time", async () => {
    let asked = 0;
    const load = async () => {
      asked++;
      return { name: "New Person", email: "new@example.com" };
    };
    const first = await ensureUser("clerk_abc", load);
    const second = await ensureUser("clerk_abc", load);
    expect(first.id).toBe(second.id);
    expect(first).toMatchObject({ name: "New Person", role: "user" });
    expect(asked).toBe(1);
  });
});
