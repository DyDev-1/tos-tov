import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// docs/mvp-checklist.md says where each MVP feature lives. This test fails if a file it names is missing,
// so the checklist cannot go out of date.

const doc = readFileSync("docs/mvp-checklist.md", "utf8");
const PREFIXES = ["src/", "tests/", "messages/", "drizzle/", "scripts/", "data/", "docs/", ".github/"];
const paths = [...doc.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]).filter((p) => PREFIXES.some((prefix) => p.startsWith(prefix)));

describe("docs/mvp-checklist.md", () => {
  it("names a good number of files (so this test cannot pass by finding none)", () => {
    expect(paths.length).toBeGreaterThan(60);
  });

  it.each([...new Set(paths)])("%s exists", (path) => {
    // A folder written with a trailing slash ("src/lib/services/") counts too.
    expect(existsSync(path), path).toBe(true);
  });

  it("covers all 11 MVP features", () => {
    for (let n = 1; n <= 11; n++) expect(doc).toMatch(new RegExp(`\\| ${n} \\|`));
  });
});

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("claude.md architecture rules", () => {
  const sources = files("src").filter((f) => /\.(ts|tsx)$/.test(f));

  it('has no Server Actions: anything a mobile app needs must be a Route Handler', () => {
    const offenders = sources.filter((f) => /^\s*["']use server["']/m.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("keeps database access out of pages and components (business logic lives in lib/services)", () => {
    const offenders = sources
      .filter((f) => f.startsWith("src/app/[locale]") || f.startsWith("src/components"))
      .filter((f) => /from "@\/db"|from "drizzle-orm|from "@\/db\/schema"/.test(readFileSync(f, "utf8")));
    // Only type imports are allowed there.
    const real = offenders.filter((f) => /^import (?!type)[^\n]*from "(@\/db|drizzle-orm)/m.test(readFileSync(f, "utf8")));
    expect(real).toEqual([]);
  });

  it("does not read request bodies without checking them with Zod (every route that reads a body uses a schema)", () => {
    const routes = sources.filter((f) => f.endsWith("/route.ts"));
    for (const route of routes) {
      const text = readFileSync(route, "utf8");
      if (text.includes("readJson(") || text.includes("parseBody(")) expect(text, route).toMatch(/Schema/);
    }
  });
});
