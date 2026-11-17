import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postComment } from "@/app/api/v1/places/[slug]/comments/route";
import { PUT as like } from "@/app/api/v1/places/[slug]/like/route";
import { GET as getMe } from "@/app/api/v1/places/[slug]/me/route";
import { POST as postPost } from "@/app/api/v1/places/[slug]/posts/route";
import { POST as postReport } from "@/app/api/v1/places/[slug]/reports/route";
import { PUT as save } from "@/app/api/v1/places/[slug]/save/route";
import { POST as postPlace } from "@/app/api/v1/places/route";
import { POST as postUpload } from "@/app/api/v1/uploads/image/route";
import { users, type UserRow } from "@/db/schema";
import * as auth from "@/lib/auth";
import { banUser, unbanUser } from "@/lib/services/admin";
import { createTestAdmin, createTestUser, db, resetAndSeedPlaces } from "../support/db";
import { eq } from "drizzle-orm";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(), requireAdmin: vi.fn() }));

const ctx = { params: Promise.resolve({ slug: "bou-sra-waterfall" }) } as never;
const post = (body: unknown = {}) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
const put = () => new Request("http://localhost/x", { method: "PUT" });

let person: UserRow;
beforeEach(async () => {
  await resetAndSeedPlaces();
  person = await createTestUser("Troll");
  await banUser(await createTestAdmin(), person.id, "Spam");
  const [fresh] = await db.select().from(users).where(eq(users.id, person.id));
  vi.mocked(auth.getCurrentUser).mockResolvedValue(fresh);
});

describe("a banned person cannot write", () => {
  const writes: [string, () => Promise<Response>][] = [
    ["like", () => like(put(), ctx)],
    ["save", () => save(put(), ctx)],
    ["comment", () => postComment(post({ body: "hello there" }), ctx)],
    ["report", () => postReport(post({ reason: "other" }), ctx)],
    ["post", () => postPost(post({ story: "A lovely quiet morning.", rating: 5, visitedAt: "2026-11-01" }), ctx)],
    ["new place", () => postPlace(post({}))],
    ["photo upload", () => postUpload(post({ contentType: "image/webp", size: 1000 }))],
  ];

  it.each(writes)("%s answers 403 banned", async (_name, call) => {
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("banned");
  });

  it("can still read their own state", async () => {
    expect((await getMe(new Request("http://localhost/x"), ctx)).status).toBe(200);
  });

  it("can write again after the ban is lifted", async () => {
    await unbanUser(await createTestAdmin("Second"), person.id);
    const [fresh] = await db.select().from(users).where(eq(users.id, person.id));
    vi.mocked(auth.getCurrentUser).mockResolvedValue(fresh);
    expect((await like(put(), ctx)).status).toBe(200);
  });
});
