import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getPosts, POST as postPost } from "@/app/api/v1/places/[slug]/posts/route";
import { photos, places, posts, users, type UserRow } from "@/db/schema";
import * as auth from "@/lib/auth";
import { createPost, getRatingSummary, listPosts } from "@/lib/services/posts";
import { getPlaceBySlug, listPlaces } from "@/lib/services/places";
import { createPostInputSchema, postSchema, type CreatePostInput } from "@/lib/validation/posts";
import { listPlacesQuerySchema } from "@/lib/validation/places";
import { createTestUser, db, resetAndSeedPlaces } from "../support/db";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(), requireAdmin: vi.fn() }));

const SLUG = "bou-sra-waterfall";
const BASE = "https://photos.example.com";
const input = (change: Partial<CreatePostInput> = {}): CreatePostInput =>
  createPostInputSchema.parse({ story: "A lovely quiet morning here.", rating: 5, visitedAt: "2026-11-01", ...change });
const placeId = async (slug: string) => (await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)))[0].id;

beforeEach(async () => {
  await resetAndSeedPlaces();
  vi.stubEnv("R2_ACCOUNT_ID", "a");
  vi.stubEnv("R2_ACCESS_KEY_ID", "k");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "s");
  vi.stubEnv("R2_BUCKET", "b");
  vi.stubEnv("R2_PUBLIC_URL", BASE);
});
afterEach(() => vi.unstubAllEnvs());

describe("createPost", () => {
  it("saves a pending post for a regular user", async () => {
    const user = await createTestUser("Sophea");
    const result = await createPost(user, SLUG, input());
    expect(result).toMatchObject({ ok: true, post: { status: "pending" } });
    const [row] = await db.select().from(posts).where(eq(posts.userId, user.id));
    expect(row).toMatchObject({ story: "A lovely quiet morning here.", rating: 5, visitedAt: "2026-11-01", status: "pending" });
  });

  it("publishes at once for an admin", async () => {
    const [admin] = await db.insert(users).values({ clerkId: "test:admin", name: "Admin", role: "admin" }).returning();
    expect(await createPost(admin, SLUG, input())).toMatchObject({ ok: true, post: { status: "published" } });
  });

  it("keeps a pending post, its rating and its photos out of public view", async () => {
    const user = await createTestUser();
    const before = await getRatingSummary(await placeId(SLUG));
    await createPost(user, SLUG, input({ rating: 1, photos: [`${BASE}/places/1/secret.webp`] }));

    expect((await listPosts(SLUG, { limit: 10, offset: 0 }))!.total).toBe(2);
    expect(await getRatingSummary(await placeId(SLUG))).toEqual(before);
    const place = await getPlaceBySlug(SLUG);
    expect(place!.photos.map((p) => p.url)).not.toContain(`${BASE}/places/1/secret.webp`);
    const card = (await listPlaces(listPlacesQuerySchema.parse({ q: "Bou Sra" }))).items[0];
    expect(card.coverPhoto).toBeNull();
  });

  it("saves the photos with the post", async () => {
    const user = await createTestUser();
    const { post } = (await createPost(user, SLUG, input({ photos: [`${BASE}/places/1/a.webp`, `${BASE}/places/1/b.webp`] }))) as { post: { id: number } };
    const saved = await db.select().from(photos).where(eq(photos.postId, post.id)).orderBy(photos.sortOrder);
    expect(saved.map((p) => p.url)).toEqual([`${BASE}/places/1/a.webp`, `${BASE}/places/1/b.webp`]);
  });

  it("shows a post's photos on the place once it is published", async () => {
    const user = await createTestUser();
    const { post } = (await createPost(user, SLUG, input({ photos: [`${BASE}/places/1/a.webp`] }))) as { post: { id: number } };
    await db.update(posts).set({ status: "published" }).where(eq(posts.id, post.id));

    expect((await getPlaceBySlug(SLUG))!.photos.map((p) => p.url)).toEqual([`${BASE}/places/1/a.webp`]);
    const card = (await listPlaces(listPlacesQuerySchema.parse({ q: "Bou Sra" }))).items[0];
    expect(card.coverPhoto?.url).toBe(`${BASE}/places/1/a.webp`);
  });

  it("puts a photo of the place itself before a photo from a post", async () => {
    const user = await createTestUser();
    const { post } = (await createPost(user, SLUG, input({ photos: [`${BASE}/places/1/post.webp`] }))) as { post: { id: number } };
    await db.update(posts).set({ status: "published" }).where(eq(posts.id, post.id));
    await db.insert(photos).values({ placeId: await placeId(SLUG), url: `${BASE}/places/1/place.webp`, sortOrder: 5 });
    expect((await getPlaceBySlug(SLUG))!.photos.map((p) => p.url)).toEqual([`${BASE}/places/1/place.webp`, `${BASE}/places/1/post.webp`]);
  });

  it("stops a person from sharing more than 5 posts an hour, but not an admin", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i++) expect((await createPost(user, SLUG, input())).ok).toBe(true);
    expect(await createPost(user, SLUG, input())).toEqual({ ok: false, reason: "rate_limited" });
    const [admin] = await db.insert(users).values({ clerkId: "test:admin2", name: "Admin", role: "admin" }).returning();
    for (let i = 0; i < 6; i++) expect((await createPost(admin, SLUG, input())).ok).toBe(true);
  });

  it("refuses photos that were not uploaded to our storage", async () => {
    const user = await createTestUser();
    expect(await createPost(user, SLUG, input({ photos: ["https://evil.example.org/x.webp"] }))).toEqual({ ok: false, reason: "invalid_photos" });
    vi.unstubAllEnvs();
    expect(await createPost(user, SLUG, input({ photos: [`${BASE}/places/1/a.webp`] }))).toEqual({ ok: false, reason: "invalid_photos" });
  });

  it("allows a post without photos even when storage is not set up", async () => {
    vi.unstubAllEnvs();
    const user = await createTestUser();
    expect((await createPost(user, SLUG, input())).ok).toBe(true);
  });

  it("refuses an unknown or unpublished place", async () => {
    const user = await createTestUser();
    expect(await createPost(user, "nope", input())).toEqual({ ok: false, reason: "not_found" });
    await db.update(places).set({ status: "pending" }).where(eq(places.slug, "angkor-wat"));
    expect(await createPost(user, "angkor-wat", input())).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("listPosts and rating", () => {
  it("lists published posts newest first, with author and photos", async () => {
    const result = await listPosts(SLUG, { limit: 10, offset: 0 });
    expect(result!.total).toBe(2);
    expect(result!.items.map((p) => p.author.name)).toEqual(["Vanna", "Emma"]);
    expect(() => postSchema.array().parse(result!.items)).not.toThrow();
  });

  it("pages through posts", async () => {
    const page = await listPosts(SLUG, { limit: 1, offset: 1 });
    expect(page!.items.map((p) => p.author.name)).toEqual(["Emma"]);
    expect(page!.total).toBe(2);
  });

  it("does not list hidden posts", async () => {
    await db.update(posts).set({ status: "hidden" }).where(eq(posts.placeId, await placeId(SLUG)));
    expect((await listPosts(SLUG, { limit: 10, offset: 0 }))!.items).toEqual([]);
  });

  it("returns null for an unknown place", async () => {
    expect(await listPosts("nope", { limit: 5, offset: 0 })).toBeNull();
  });

  it("averages the published ratings to one decimal", async () => {
    expect(await getRatingSummary(await placeId(SLUG))).toEqual({ average: 4.5, count: 2 });
    const user = await createTestUser();
    const [admin] = await db.insert(users).values({ clerkId: "test:admin3", name: "A", role: "admin" }).returning();
    await createPost(admin, SLUG, input({ rating: 2 }));
    expect(await getRatingSummary(await placeId(SLUG))).toEqual({ average: 3.7, count: 3 });
    void user;
  });

  it("has no average when nobody rated yet", async () => {
    expect(await getRatingSummary(await placeId("kep-crab-market"))).toEqual({ average: null, count: 0 });
  });

  it("puts the rating on the place page data", async () => {
    expect((await getPlaceBySlug(SLUG))!.rating).toEqual({ average: 4.5, count: 2 });
    expect((await getPlaceBySlug("kep-crab-market"))!.rating).toEqual({ average: null, count: 0 });
  });
});

describe("posts API", () => {
  let user: UserRow;
  const ctx = (slug = SLUG) => ({ params: Promise.resolve({ slug }) }) as never;
  const url = `http://localhost/api/v1/places/${SLUG}/posts`;
  const send = (payload: unknown, slug = SLUG) =>
    postPost(new Request(url, { method: "POST", body: JSON.stringify(payload) }), ctx(slug));
  const body = (change: Record<string, unknown> = {}) => ({ story: "A lovely quiet morning here.", rating: 5, visitedAt: "2026-11-01", ...change });

  beforeEach(async () => {
    user = await createTestUser("Sophea");
    vi.mocked(auth.getCurrentUser).mockResolvedValue(user);
  });

  it("lets anyone read published posts, and caches them", async () => {
    const res = await getPosts(new Request(url), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.meta).toEqual({ total: 2, limit: 5, offset: 0 });
  });

  it("answers 404 for an unknown place", async () => {
    expect((await getPosts(new Request(url), ctx("nope"))).status).toBe(404);
    expect((await send(body(), "nope")).status).toBe(404);
  });

  it("answers 401 when nobody is logged in", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    expect((await send(body())).status).toBe(401);
  });

  it("answers 201 and keeps the post pending", async () => {
    const res = await send(body());
    expect(res.status).toBe(201);
    expect((await res.json()).data).toEqual({ id: expect.any(Number), status: "pending" });
    // Pending: still not public.
    expect(((await (await getPosts(new Request(url), ctx())).json()).data as unknown[]).length).toBe(2);
  });

  it.each([
    ["a short story", { story: "Nice" }],
    ["a rating of 9", { rating: 9 }],
    ["a day in the future", { visitedAt: "2999-01-01" }],
    ["a day written wrongly", { visitedAt: "yesterday" }],
  ])("answers 400 for %s", async (_name, change) => {
    const res = await send(body(change));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_body");
  });

  it("answers 400 for a body that is not JSON", async () => {
    expect((await postPost(new Request(url, { method: "POST", body: "nope" }), ctx())).status).toBe(400);
  });

  it("answers 400 for photos from somewhere else", async () => {
    const res = await send(body({ photos: ["https://evil.example.org/x.webp"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_photos");
  });

  it("answers 429 after 5 posts in an hour", async () => {
    for (let i = 0; i < 5; i++) await send(body());
    const res = await send(body());
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("rate_limited");
  });
});
