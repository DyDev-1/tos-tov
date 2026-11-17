import { beforeEach, describe, expect, it } from "vitest";
import { seed } from "@/db/seed";
import { listCategories, listProvinces } from "@/lib/services/reference";
import { db, resetAndSeed, resetDatabase } from "../support/db";

describe("reference service", () => {
  beforeEach(resetAndSeed);

  it("lists all 25 provinces, popular ones first", async () => {
    const provinces = await listProvinces();
    expect(provinces).toHaveLength(25);
    expect(provinces.slice(0, 3).map((p) => p.slug)).toEqual(["siem-reap", "kampot", "mondulkiri"]);
  });

  it("returns the public shape only (no database columns)", async () => {
    const [first] = await listProvinces();
    expect(first).toEqual({
      id: expect.any(Number),
      slug: "siem-reap",
      name: { en: "Siem Reap", km: "សៀមរាប" },
    });
    expect(Object.keys(first)).toEqual(["id", "slug", "name"]);
  });

  it("lists categories in display order", async () => {
    const categories = await listCategories();
    expect(categories.map((c) => c.slug)).toEqual(["temples", "waterfalls", "beaches", "mountains", "food"]);
  });

  it("seeding twice does not create duplicates", async () => {
    await seed(db);
    expect(await listProvinces()).toHaveLength(25);
    expect(await listCategories()).toHaveLength(5);
  });

  it("returns empty lists when nothing is seeded", async () => {
    await resetDatabase();
    expect(await listProvinces()).toEqual([]);
    expect(await listCategories()).toEqual([]);
  });
});
