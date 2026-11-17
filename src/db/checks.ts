import type postgres from "postgres";

// Health checks for a database. Run with `npm run db:check` against local Docker, staging or production.
// Each check says what it found in plain words, so a beginner can act on it.

export type Check = { name: string; ok: boolean; detail: string };

export async function runDatabaseChecks(sql: postgres.Sql, expectedMigrations?: number): Promise<Check[]> {
  const checks: Check[] = [];

  const [{ version }] = await sql<{ version: string }[]>`select version()`;
  checks.push({ name: "Connection", ok: true, detail: version.split(",")[0] });

  // PostGIS: needed for map pins and "places near here".
  const postgis = await sql<{ version: string; schema: string }[]>`
    select e.extversion as version, n.nspname as schema
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'postgis'`;
  checks.push(
    postgis[0]
      ? {
          name: "PostGIS",
          ok: true,
          detail: `version ${postgis[0].version} in schema "${postgis[0].schema}"`,
        }
      : { name: "PostGIS", ok: false, detail: "not installed. Run the migrations, or enable it in Database > Extensions." },
  );

  // Row-level security on every table of ours.
  const open = await sql<{ name: string }[]>`
    select c.relname as name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity and c.relname <> 'spatial_ref_sys'
    order by 1`;
  checks.push({
    name: "Row-level security",
    ok: open.length === 0,
    detail: open.length === 0 ? "on for every table" : `OFF for: ${open.map((t) => t.name).join(", ")}. Run the migrations.`,
  });

  // The public API roles of Supabase must not hold rights on our tables.
  const apiGrants = await sql<{ grantee: string; n: string }[]>`
    select grantee, count(*)::text as n
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
    group by grantee`;
  checks.push({
    name: "Public API access",
    ok: apiGrants.length === 0,
    detail:
      apiGrants.length === 0
        ? "the anon and authenticated roles have no table rights"
        : `${apiGrants.map((g) => `${g.grantee} (${g.n} rights)`).join(", ")} can still use the public API. Run the migrations.`,
  });

  // Migrations applied.
  const applied = await sql<{ n: string }[]>`select count(*)::text as n from drizzle.__drizzle_migrations`.catch(() => null);
  const count = applied ? Number(applied[0].n) : 0;
  checks.push({
    name: "Migrations",
    ok: expectedMigrations === undefined ? count > 0 : count === expectedMigrations,
    detail: applied
      ? `${count} applied${expectedMigrations !== undefined ? ` of ${expectedMigrations}` : ""}`
      : "none applied yet. Run npm run db:migrate.",
  });

  return checks;
}
