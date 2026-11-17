import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runDatabaseChecks } from "@/db/checks";
import { db, resetAndSeedPlaces } from "../support/db";
import { sql as rawSql } from "drizzle-orm";

const migrationCount = (JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: unknown[] }).entries.length;
let client: postgres.Sql;

beforeAll(() => {
  client = postgres(process.env.TEST_DATABASE_URL!, { max: 1, onnotice: () => {} });
});
afterAll(async () => {
  // Remove the pretend roles so this test leaves the database server as it found it.
  await client.unsafe("drop role if exists rls_probe").catch(() => {});
  await client.unsafe("drop role if exists anon").catch(() => {});
  await client.end();
});

describe("row-level security (Supabase's public API must see nothing)", () => {
  beforeAll(resetAndSeedPlaces);

  it("is on for every table, so a new table cannot forget it", async () => {
    const open = await client`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity and c.relname <> 'spatial_ref_sys'`;
    expect(open.map((r) => r.relname)).toEqual([]);
  });

  it("hides every row from a role that is not the owner (like Supabase's anon role)", async () => {
    await client.unsafe(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'rls_probe') then create role rls_probe nologin; end if;
      end $$;
      grant select on all tables in schema public to rls_probe;`);

    const asOwner = await client`select count(*)::int as n from places`;
    expect(asOwner[0].n).toBe(8);

    const asProbe = await client.begin(async (tx) => {
      await tx.unsafe("set local role rls_probe");
      return {
        places: (await tx`select count(*)::int as n from places`)[0].n,
        users: (await tx`select count(*)::int as n from users`)[0].n,
        comments: (await tx`select count(*)::int as n from comments`)[0].n,
      };
    });
    expect(asProbe).toEqual({ places: 0, users: 0, comments: 0 });

    await client.unsafe("revoke all on all tables in schema public from rls_probe");
  });

  it("still lets the app (the owner) read and write", async () => {
    const result = await db.execute(rawSql`select count(*)::int as n from places`);
    expect(Number(result[0].n)).toBe(8);
  });
});

describe("runDatabaseChecks", () => {
  it("passes on a correctly migrated database", async () => {
    const checks = await runDatabaseChecks(client, migrationCount);
    expect(checks.filter((c) => !c.ok)).toEqual([]);
    expect(checks.map((c) => c.name)).toEqual(["Connection", "PostGIS", "Row-level security", "Public API access", "Migrations"]);
  });

  it("reports PostGIS in its schema", async () => {
    const postgis = (await runDatabaseChecks(client)).find((c) => c.name === "PostGIS")!;
    expect(postgis.detail).toMatch(/version 3\.\d+/);
  });

  it("catches a table that forgot row-level security", async () => {
    await client.unsafe("create table rls_forgotten (id int)");
    try {
      const rls = (await runDatabaseChecks(client)).find((c) => c.name === "Row-level security")!;
      expect(rls.ok).toBe(false);
      expect(rls.detail).toContain("rls_forgotten");
    } finally {
      await client.unsafe("drop table rls_forgotten");
    }
  });

  it("catches rights left to the public API roles", async () => {
    await client.unsafe(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      end $$;
      grant select on places to anon;`);
    try {
      const api = (await runDatabaseChecks(client)).find((c) => c.name === "Public API access")!;
      expect(api.ok).toBe(false);
      expect(api.detail).toContain("anon");
    } finally {
      await client.unsafe("revoke all on all tables in schema public from anon");
    }
  });

  it("notices missing migrations", async () => {
    const migrations = (await runDatabaseChecks(client, migrationCount + 3)).find((c) => c.name === "Migrations")!;
    expect(migrations.ok).toBe(false);
    expect(migrations.detail).toContain(`${migrationCount} applied of ${migrationCount + 3}`);
  });
});
