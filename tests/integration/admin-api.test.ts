/// <reference types="vite/client" />
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAudit } from "@/app/api/v1/admin/audit-log/route";
import { GET as getCategories, POST as postCategory } from "@/app/api/v1/admin/categories/route";
import { DELETE as deleteCategoryRoute, PATCH as patchCategory } from "@/app/api/v1/admin/categories/[id]/route";
import { DELETE as deleteGuideRoute, PUT as putGuide } from "@/app/api/v1/admin/guides/[id]/route";
import { GET as getOverview } from "@/app/api/v1/admin/overview/route";
import { GET as getAdminPlaceRoute, PATCH as patchPlace } from "@/app/api/v1/admin/places/[id]/route";
import { POST as postGuide } from "@/app/api/v1/admin/places/[id]/guides/route";
import { POST as postMerge } from "@/app/api/v1/admin/places/[id]/merge/route";
import { POST as postPlaceStatus } from "@/app/api/v1/admin/places/[id]/status/route";
import { GET as getAdminPlaces } from "@/app/api/v1/admin/places/route";
import { GET as getAdminUsers } from "@/app/api/v1/admin/users/route";
import { DELETE as unbanRoute, POST as banRoute } from "@/app/api/v1/admin/users/[id]/ban/route";
import { places, users, type UserRow } from "@/db/schema";
import * as auth from "@/lib/auth";
import { createTestAdmin, createTestUser, db, resetAndSeedPlaces } from "../support/db";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(), requireAdmin: vi.fn() }));

const login = (user: UserRow | null) => vi.mocked(auth.getCurrentUser).mockResolvedValue(user);
const idOf = async (slug: string) => (await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)))[0].id;
const ctx = (id: string | number) => ({ params: Promise.resolve({ id: String(id) }) }) as never;
const req = (method: string, body?: unknown, path = "x") =>
  new Request(`http://localhost/api/v1/admin/${path}`, { method, body: body === undefined || method === "GET" ? undefined : JSON.stringify(body) });

let admin: UserRow;
beforeEach(async () => {
  await resetAndSeedPlaces();
  admin = await createTestAdmin();
  login(admin);
});

// ---- The most important test: no admin route can forget the role check ----
describe("every admin route checks the role on the server", () => {
  const routes = import.meta.glob("/src/app/api/v1/admin/**/route.ts");
  const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

  it("finds all the admin routes (so this test cannot pass by finding none)", () => {
    expect(Object.keys(routes).length).toBeGreaterThanOrEqual(19);
  });

  for (const [path, load] of Object.entries(routes)) {
    const name = path.replace("/src/app/api/v1/admin/", "").replace("/route.ts", "");
    for (const method of METHODS) {
      it(`${method} ${name}: 401 when logged out, 403 for a regular user, 403 for a banned admin`, async () => {
        const handler = ((await load()) as Record<string, (r: Request, c: unknown) => Promise<Response>>)[method];
        if (!handler) return; // this route does not have that method

        login(null);
        expect((await handler(req(method, {}), ctx(1))).status).toBe(401);

        login(await createTestUser("Regular"));
        expect((await handler(req(method, {}), ctx(1))).status).toBe(403);

        const [bannedAdmin] = await db.insert(users).values({ clerkId: `test:ba:${Math.random()}`, name: "BA", role: "admin", bannedAt: new Date() }).returning();
        login(bannedAdmin);
        expect((await handler(req(method, {}), ctx(1))).status).toBe(403);
      });
    }
  }
});

describe("reading", () => {
  it("overview: counts, never cached", async () => {
    const res = await getOverview();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect((await res.json()).data).toMatchObject({ pendingPlaces: 0, totalPlaces: 8 });
  });

  it("places: filters, pages and rejects bad options", async () => {
    await db.update(places).set({ status: "pending" }).where(eq(places.slug, "angkor-wat"));
    const pending = await (await getAdminPlaces(req("GET", undefined, "places?status=pending"))).json();
    expect(pending.data.map((p: { slug: string }) => p.slug)).toEqual(["angkor-wat"]);
    expect(pending.meta).toEqual({ total: 1, limit: 25, offset: 0 });
    expect((await getAdminPlaces(req("GET", undefined, "places?status=weird"))).status).toBe(400);
    expect((await getAdminPlaces(req("GET", undefined, "places?limit=5000"))).status).toBe(400);
  });

  it("one place: full detail, 404 and 400", async () => {
    const res = await getAdminPlaceRoute(req("GET"), ctx(await idOf("bou-sra-waterfall")));
    expect((await res.json()).data).toMatchObject({ slug: "bou-sra-waterfall", status: "published", guides: expect.any(Array) });
    expect((await getAdminPlaceRoute(req("GET"), ctx(99999))).status).toBe(404);
    expect((await getAdminPlaceRoute(req("GET"), ctx("abc"))).status).toBe(400);
    expect((await getAdminPlaceRoute(req("GET"), ctx(-3))).status).toBe(400);
  });

  it("users: shows emails to admins but never Clerk ids", async () => {
    await db.insert(users).values({ clerkId: "test:secret-id", name: "Sok", email: "sok@example.com" });
    const text = await (await getAdminUsers(req("GET", undefined, "users?q=sok"))).text();
    expect(text).toContain("sok@example.com");
    expect(text).not.toContain("secret-id");
    expect(text).not.toContain("clerkId");
  });

  it("audit log: lists entries and rejects a bad page size", async () => {
    await postPlaceStatus(req("POST", { status: "hidden" }), ctx(await idOf("angkor-wat")));
    const res = await getAudit(req("GET", undefined, "audit-log"));
    expect((await res.json()).data[0]).toMatchObject({ action: "place.hide", admin: { name: "Admin" }, target: { type: "place" } });
    expect((await getAudit(req("GET", undefined, "audit-log?limit=0"))).status).toBe(400);
  });
});

describe("changing places", () => {
  it("edits a place", async () => {
    const id = await idOf("kep-crab-market");
    const res = await patchPlace(req("PATCH", { nameEn: "New name", lat: 10.5, lng: 104.3 }), ctx(id));
    expect(res.status).toBe(200);
    expect((await (await getAdminPlaceRoute(req("GET"), ctx(id))).json()).data.name.en).toBe("New name");
  });

  it.each([
    ["an empty change", {}, "at least one field"],
    ["a pin without lng", { lat: 10.5 }, "lat and lng together"],
    ["a pin outside Cambodia", { lat: 48, lng: 2 }, undefined],
    ["a fee below zero", { entryFeeKhr: -5 }, undefined],
    ["an empty name", { nameEn: "" }, undefined],
  ])("rejects %s with 400", async (_name, body, text) => {
    const res = await patchPlace(req("PATCH", body), ctx(await idOf("kep-crab-market")));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("invalid_body");
    if (text) expect(json.error.message).toContain(text);
  });

  it("answers 400 for an unknown province, 404 for an unknown place and 400 when the body is not JSON", async () => {
    expect((await patchPlace(req("PATCH", { provinceSlug: "atlantis" }), ctx(await idOf("kep-crab-market")))).status).toBe(400);
    expect((await patchPlace(req("PATCH", { nameEn: "X" }), ctx(99999))).status).toBe(404);
    const notJson = new Request("http://localhost/x", { method: "PATCH", body: "nope" });
    expect((await patchPlace(notJson, ctx(1))).status).toBe(400);
  });

  it("approves and hides, and refuses a status that is not allowed", async () => {
    const id = await idOf("angkor-wat");
    expect((await postPlaceStatus(req("POST", { status: "hidden" }), ctx(id))).status).toBe(200);
    expect((await postPlaceStatus(req("POST", { status: "pending" }), ctx(id))).status).toBe(400);
    expect((await postPlaceStatus(req("POST", { status: "published" }), ctx(99999))).status).toBe(404);
  });

  it("merges, and explains each refusal with the right code", async () => {
    const dup = await idOf("kep-crab-market");
    const target = await idOf("long-set-beach");
    expect((await postMerge(req("POST", { targetId: dup }), ctx(dup))).status).toBe(400);
    expect((await postMerge(req("POST", { targetId: 99999 }), ctx(dup))).status).toBe(404);
    expect((await postMerge(req("POST", { targetId: target }), ctx(dup))).status).toBe(200);
    const again = await postMerge(req("POST", { targetId: target }), ctx(dup));
    expect(again.status).toBe(409);
    expect((await again.json()).error.code).toBe("already_merged");
    expect((await postMerge(req("POST", { targetId: "x" }), ctx(dup))).status).toBe(400);
  });

  it("adds, edits and removes guides", async () => {
    const id = await idOf("angkor-wat");
    const guide = { name: "Sophea", tourEn: "Day trip", tourKm: "ដំណើរមួយថ្ងៃ", priceText: "$25", contactType: "telegram", contactValue: "sophea_guide" };
    const created = await postGuide(req("POST", guide), ctx(id));
    expect(created.status).toBe(201);
    const guideId = (await created.json()).data.id;

    expect((await putGuide(req("PUT", { ...guide, name: "Sophea K." }), ctx(guideId))).status).toBe(200);
    expect((await putGuide(req("PUT", { ...guide, contactValue: "@bad name" }), ctx(guideId))).status).toBe(400);
    expect((await postGuide(req("POST", { ...guide, contactType: "phone", contactValue: "call me" }), ctx(id))).status).toBe(400);
    expect((await postGuide(req("POST", guide), ctx(99999))).status).toBe(404);
    expect((await deleteGuideRoute(req("DELETE"), ctx(guideId))).status).toBe(200);
    expect((await deleteGuideRoute(req("DELETE"), ctx(guideId))).status).toBe(404);
  });
});

describe("categories", () => {
  it("lists, adds, edits and deletes", async () => {
    expect((await (await getCategories()).json()).data).toHaveLength(5);
    const created = await postCategory(req("POST", { slug: "markets", nameEn: "Markets", nameKm: "ផ្សារ" }));
    expect(created.status).toBe(201);
    const id = (await created.json()).data.id;
    expect((await patchCategory(req("PATCH", { nameEn: "Local markets" }), ctx(id))).status).toBe(200);
    expect((await deleteCategoryRoute(req("DELETE"), ctx(id))).status).toBe(200);
  });

  it("refuses a repeated or badly written web name, and deleting a category in use", async () => {
    const dup = await postCategory(req("POST", { slug: "food", nameEn: "F", nameKm: "ក" }));
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe("slug_taken");
    expect((await postCategory(req("POST", { slug: "Not A Slug", nameEn: "F", nameKm: "ក" }))).status).toBe(400);
    expect((await patchCategory(req("PATCH", {}), ctx(1))).status).toBe(400);
    const inUse = await deleteCategoryRoute(req("DELETE"), ctx(1));
    expect(inUse.status).toBe(409);
    expect((await inUse.json()).error.code).toBe("in_use");
  });
});

describe("banning", () => {
  it("bans with a reason, refuses a second ban, and lifts it", async () => {
    const user = await createTestUser("Troll");
    expect((await banRoute(req("POST", { reason: "Spam" }), ctx(user.id))).status).toBe(200);
    expect((await banRoute(req("POST", { reason: "Spam again" }), ctx(user.id))).status).toBe(409);
    expect((await unbanRoute(req("DELETE"), ctx(user.id))).status).toBe(200);
    expect((await unbanRoute(req("DELETE"), ctx(user.id))).status).toBe(409);
  });

  it("needs a reason, and never bans an admin or yourself", async () => {
    const user = await createTestUser();
    expect((await banRoute(req("POST", {}), ctx(user.id))).status).toBe(400);
    expect((await banRoute(req("POST", { reason: "x" }), ctx(user.id))).status).toBe(400);
    const other = await createTestAdmin("Other");
    expect((await banRoute(req("POST", { reason: "No reason" }), ctx(other.id))).status).toBe(403);
    expect((await banRoute(req("POST", { reason: "No reason" }), ctx(admin.id))).status).toBe(403);
    expect((await banRoute(req("POST", { reason: "Nobody" }), ctx(99999))).status).toBe(404);
  });
});
