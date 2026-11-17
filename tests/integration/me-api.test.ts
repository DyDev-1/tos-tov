import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getMeRoute } from "@/app/api/v1/me/route";
import { users } from "@/db/schema";
import * as auth from "@/lib/auth";
import { createTestAdmin, createTestUser, db, resetAndSeedPlaces } from "../support/db";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(), requireAdmin: vi.fn() }));

beforeEach(resetAndSeedPlaces);

describe("GET /api/v1/me", () => {
  it("answers 401 when nobody is logged in", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    expect((await getMeRoute()).status).toBe(401);
  });

  it("tells a regular person they are not an admin, and never caches the answer", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(await createTestUser("Sok"));
    const res = await getMeRoute();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect((await res.json()).data).toEqual({ name: "Sok", role: "user", banned: false });
  });

  it("tells an admin they are one", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(await createTestAdmin("Dara"));
    expect((await (await getMeRoute()).json()).data).toEqual({ name: "Dara", role: "admin", banned: false });
  });

  it("shows a ban, and does not leak anything else", async () => {
    const [banned] = await db.insert(users).values({ clerkId: "test:secret", name: "Troll", email: "t@example.com", bannedAt: new Date() }).returning();
    vi.mocked(auth.getCurrentUser).mockResolvedValue(banned);
    const text = await (await getMeRoute()).text();
    expect(JSON.parse(text).data.banned).toBe(true);
    expect(text).not.toContain("t@example.com");
    expect(text).not.toContain("secret");
  });
});
