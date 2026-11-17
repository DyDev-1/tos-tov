import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Next.js does not run a layout again when you move between pages inside it, so a role check in the
// layout is not enough. Every admin PAGE must check the role itself. This test fails if one forgets.

function files(dir: string, name: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path, name) : entry === name ? [path] : [];
  });
}

describe("admin pages", () => {
  const pages = files("src/app/[locale]/admin", "page.tsx");

  it("finds the admin pages (so this test cannot pass by finding none)", () => {
    expect(pages.length).toBeGreaterThanOrEqual(9);
  });

  it.each(pages)("%s checks the admin role before fetching anything", (path) => {
    const source = readFileSync(path, "utf8");
    const guard = source.indexOf("requireAdminPage(");
    expect(guard, "calls requireAdminPage").toBeGreaterThan(-1);
    // The check comes before any data is read.
    for (const word of ["listAdmin", "getAdmin", "listAuditLog", "listProvinces", "listCategories"]) {
      const used = source.indexOf(`${word}(`);
      if (used !== -1) expect(guard, `${word} must come after the role check`).toBeLessThan(used);
    }
  });

  it("the admin layout also checks the role", () => {
    expect(readFileSync("src/app/[locale]/admin/layout.tsx", "utf8")).toContain("requireAdminPage(");
  });

  it("every admin API route uses withAdmin, which checks the role first", () => {
    const routes = files("src/app/api/v1/admin", "route.ts");
    expect(routes.length).toBeGreaterThanOrEqual(20);
    for (const path of routes) expect(readFileSync(path, "utf8"), path).toContain("withAdmin(");
  });
});
