import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import { GET } from "@/app/api/v1/health/route";

describe("GET /api/v1/health", () => {
  it("says the database is up and which release is running", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", database: "up", version: pkg.version, commit: expect.toSatisfy((c: unknown) => c === null || typeof c === "string") });
  });

  it("is the first release: 0.0.1", () => {
    expect(pkg.version).toBe("0.0.1");
  });
});
