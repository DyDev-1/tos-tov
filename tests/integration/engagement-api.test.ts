import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getComments, POST as postComment } from "@/app/api/v1/places/[slug]/comments/route";
import { DELETE as unlike, PUT as like } from "@/app/api/v1/places/[slug]/like/route";
import { GET as getMe } from "@/app/api/v1/places/[slug]/me/route";
import { POST as postReport } from "@/app/api/v1/places/[slug]/reports/route";
import { PUT as save } from "@/app/api/v1/places/[slug]/save/route";
import * as auth from "@/lib/auth";
import type { UserRow } from "@/db/schema";
import { createTestUser, resetAndSeedPlaces } from "../support/db";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(), requireAdmin: vi.fn() }));

const SLUG = "bou-sra-waterfall";
const ctx = (slug = SLUG) => ({ params: Promise.resolve({ slug }) }) as never;
const url = (path: string) => `http://localhost/api/v1/places/${SLUG}/${path}`;
const json = (body: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const loginAs = (user: UserRow | null) => vi.mocked(auth.getCurrentUser).mockResolvedValue(user);

describe("engagement API", () => {
  beforeEach(async () => {
    await resetAndSeedPlaces();
    loginAs(null);
  });

  describe("when nobody is logged in", () => {
    it.each([
      ["me", () => getMe(new Request(url("me")), ctx())],
      ["like", () => like(new Request(url("like"), { method: "PUT" }), ctx())],
      ["save", () => save(new Request(url("save"), { method: "PUT" }), ctx())],
      ["comment", () => postComment(new Request(url("comments"), json({ body: "hi" })), ctx())],
      ["report", () => postReport(new Request(url("reports"), json({ reason: "other" })), ctx())],
    ])("%s answers 401", async (_name, call) => {
      const res = await call();
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("unauthorized");
    });

    it("still lets anyone read comments", async () => {
      const res = await getComments(new Request(url("comments")), ctx());
      expect(res.status).toBe(200);
      expect((await res.json()).data).toHaveLength(2);
    });
  });

  describe("when logged in", () => {
    let user: UserRow;
    beforeEach(async () => {
      user = await createTestUser("Sophea");
      loginAs(user);
    });

    it("likes and unlikes", async () => {
      const liked = await (await like(new Request(url("like"), { method: "PUT" }), ctx())).json();
      expect(liked.data).toEqual({ liked: true, likesCount: 1249 });
      const unliked = await (await unlike(new Request(url("like"), { method: "DELETE" }), ctx())).json();
      expect(unliked.data).toEqual({ liked: false, likesCount: 1248 });
    });

    it("saves and shows it in my state", async () => {
      expect((await save(new Request(url("save"), { method: "PUT" }), ctx())).status).toBe(200);
      const me = await (await getMe(new Request(url("me")), ctx())).json();
      expect(me.data).toEqual({ liked: false, saved: true });
    });

    it("never caches my private state", async () => {
      const res = await getMe(new Request(url("me")), ctx());
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });

    it("posts a comment and answers 201", async () => {
      const res = await postComment(new Request(url("comments"), json({ body: "  Go early!  " })), ctx());
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data).toMatchObject({ body: "Go early!", author: { name: "Sophea" } });
    });

    it.each([
      ["empty", { body: "   " }],
      ["too long", { body: "x".repeat(1001) }],
      ["missing", {}],
      ["wrong type", { body: 42 }],
    ])("rejects a %s comment", async (_name, payload) => {
      const res = await postComment(new Request(url("comments"), json(payload)), ctx());
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("invalid_body");
    });

    it("rejects a body that is not JSON", async () => {
      const res = await postComment(new Request(url("comments"), { method: "POST", body: "not json" }), ctx());
      expect(res.status).toBe(400);
    });

    it("answers 429 when commenting too fast", async () => {
      for (let i = 0; i < 5; i++) await postComment(new Request(url("comments"), json({ body: `tip ${i}` })), ctx());
      const res = await postComment(new Request(url("comments"), json({ body: "again" })), ctx());
      expect(res.status).toBe(429);
      expect((await res.json()).error.code).toBe("rate_limited");
    });

    it("answers 404 for an unknown place", async () => {
      const res = await like(new Request(url("like"), { method: "PUT" }), ctx("nope"));
      expect(res.status).toBe(404);
    });

    it("accepts a report and rejects an unknown reason", async () => {
      const ok = await postReport(new Request(url("reports"), json({ reason: "unsafe", message: "Loose rocks" })), ctx());
      expect(ok.status).toBe(201);
      const bad = await postReport(new Request(url("reports"), json({ reason: "spam" })), ctx());
      expect(bad.status).toBe(400);
    });
  });
});
