import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postComment } from "@/app/api/v1/places/[slug]/comments/route";
import { POST as postPost } from "@/app/api/v1/places/[slug]/posts/route";
import { PUT as like } from "@/app/api/v1/places/[slug]/like/route";
import { PUT as save } from "@/app/api/v1/places/[slug]/save/route";
import { POST as postReport } from "@/app/api/v1/places/[slug]/reports/route";
import { POST as postPlace } from "@/app/api/v1/places/route";
import { POST as postUpload } from "@/app/api/v1/uploads/image/route";
import { GET as getFeatures } from "@/app/api/v1/features/route";
import { users, type UserRow } from "@/db/schema";
import * as auth from "@/lib/auth";
import { createTestAdmin, createTestUser, db, resetAndSeedPlaces } from "../support/db";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(), requireAdmin: vi.fn() }));

const ctx = { params: Promise.resolve({ slug: "bou-sra-waterfall" }) } as never;
const BASE = "https://photos.example.com";
const post = (body: unknown) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
const put = () => new Request("http://localhost/x", { method: "PUT" });
const login = (user: UserRow | null) => vi.mocked(auth.getCurrentUser).mockResolvedValue(user);
const stage = (n: number) => vi.stubEnv("RELEASE_STAGE", String(n));

const comment = () => postComment(post({ body: "A helpful tip for visitors." }), ctx);
const sharePost = () => postPost(post({ story: "A lovely quiet morning here.", rating: 5, visitedAt: "2026-11-01" }), ctx);
const addPlace = (change = {}) =>
  postPlace(post({ name: "Hidden Pond", provinceSlug: "pursat", categorySlug: "waterfalls", lat: 12.5, lng: 103.9, photos: [`${BASE}/places/1/pond.webp`], ...change }));
const upload = () => postUpload(post({ contentType: "image/webp", size: 1000 }));

beforeEach(async () => {
  await resetAndSeedPlaces();
  vi.stubEnv("R2_ACCOUNT_ID", "a");
  vi.stubEnv("R2_ACCESS_KEY_ID", "k");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "s");
  vi.stubEnv("R2_BUCKET", "b");
  vi.stubEnv("R2_PUBLIC_URL", BASE);
  login(await createTestUser("Sophea"));
});
afterEach(() => vi.unstubAllEnvs());

describe("stage 1: admin-posted places only", () => {
  beforeEach(() => stage(1));

  it.each([
    ["comment", comment],
    ["share a post", sharePost],
    ["add a place", () => addPlace()],
    ["upload a photo", upload],
  ])("refuses a regular person to %s with 403 feature_closed", async (_name, call) => {
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("feature_closed");
  });

  it("still lets people like, save and report", async () => {
    expect((await like(put(), ctx)).status).toBe(200);
    expect((await save(put(), ctx)).status).toBe(200);
    expect((await postReport(post({ reason: "other" }), ctx)).status).toBe(201);
  });

  it("lets an admin add places, share posts, comment and upload", async () => {
    login(await createTestAdmin());
    expect((await addPlace()).status).toBe(201);
    expect((await sharePost()).status).toBe(201);
    expect((await comment()).status).toBe(201);
    expect((await upload()).status).toBe(200);
  });

  it("checks the stage after the login: a visitor still gets 401", async () => {
    login(null);
    expect((await comment()).status).toBe(401);
  });
});

describe("stage 2: comments open", () => {
  beforeEach(() => stage(2));

  it("lets people comment, but still not share posts or add places", async () => {
    expect((await comment()).status).toBe(201);
    expect((await sharePost()).status).toBe(403);
    expect((await addPlace()).status).toBe(403);
    expect((await upload()).status).toBe(403);
  });
});

describe("stage 3: posts and new places, with approval", () => {
  beforeEach(() => stage(3));

  it("opens sharing and adding, always waiting for an admin, even for a trusted person", async () => {
    const [trusted] = await db.insert(users).values({ clerkId: "test:trusted", name: "Trusted", trusted: true }).returning();
    login(trusted);
    const place = await addPlace();
    expect(place.status).toBe(201);
    expect((await place.json()).data.status).toBe("pending");
    expect((await (await sharePost()).json()).data.status).toBe("pending");
    expect((await upload()).status).toBe(200);
  });
});

describe("stage 4: trusted people publish at once", () => {
  beforeEach(() => stage(4));

  it("publishes a trusted person's place and post without waiting", async () => {
    const [trusted] = await db.insert(users).values({ clerkId: "test:trusted2", name: "Trusted", trusted: true }).returning();
    login(trusted);
    expect((await (await addPlace()).json()).data.status).toBe("published");
    expect((await (await sharePost()).json()).data.status).toBe("published");
  });

  it("still makes an ordinary person wait", async () => {
    expect((await (await addPlace()).json()).data.status).toBe("pending");
    expect((await (await sharePost()).json()).data.status).toBe("pending");
  });

  it("does not skip the other rules for a trusted person (the hourly limit)", async () => {
    const [trusted] = await db.insert(users).values({ clerkId: "test:trusted3", name: "Trusted", trusted: true }).returning();
    login(trusted);
    for (let i = 0; i < 5; i++) expect((await sharePost()).status).toBe(201);
    expect((await sharePost()).status).toBe(429);
  });

  it("stops trusting a person once they are banned", async () => {
    const [row] = await db.insert(users).values({ clerkId: "test:t4", name: "T", trusted: true, bannedAt: new Date() }).returning();
    login((await db.select().from(users).where(eq(users.id, row.id)))[0]);
    expect((await sharePost()).status).toBe(403);
  });
});

describe("GET /api/v1/features", () => {
  it.each([1, 2, 3, 4])("reports stage %i and what is open", async (n) => {
    stage(n);
    const { data } = await (await getFeatures()).json();
    expect(data.stage).toBe(n);
    expect(data.capabilities.comment).toBe(n >= 2);
    expect(data.capabilities.addPlace).toBe(n >= 3);
    expect(data.capabilities.like).toBe(true);
  });

  it("is public and can be cached for a minute", async () => {
    expect((await getFeatures()).headers.get("Cache-Control")).toContain("max-age=60");
  });

  it("is stage 1 in production when nothing is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RELEASE_STAGE", "");
    expect((await (await getFeatures()).json()).data.stage).toBe(1);
  });
});
