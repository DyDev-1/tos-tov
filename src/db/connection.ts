import type postgres from "postgres";

// How to connect to PostgreSQL. The same app runs against three kinds of database:
//   - local Docker (development, tests, CI): plain connection, no SSL;
//   - Supabase "transaction pooler" (port 6543): the app at runtime. It shares connections between
//     many visitors, so it cannot keep "prepared statements" (so prepare: false);
//   - Supabase direct or "session pooler" (port 5432): migrations and the seed script.
// Everything here is plain functions, so it is easy to test.

type Options = postgres.Options<Record<string, postgres.PostgresType>>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "db"]);

export function isTransactionPooler(connectionString: string): boolean {
  const url = new URL(connectionString);
  return url.port === "6543" || url.searchParams.get("pgbouncer") === "true";
}

export function postgresOptions(connectionString: string, overrides: Options = {}): Options {
  const url = new URL(connectionString);
  const local = LOCAL_HOSTS.has(url.hostname);
  const options: Options = { ...overrides };

  // Hosted databases (Supabase) only accept encrypted connections. A "sslmode" written in the URL wins.
  if (!local && !url.searchParams.has("sslmode")) options.ssl = "require";
  // Transaction pooler: no prepared statements.
  if (isTransactionPooler(connectionString)) options.prepare = false;
  return options;
}

// The address used for migrations and scripts: the direct one when there is one, because DDL and
// advisory locks need a real session, which the transaction pooler does not give.
export function migrationUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.DIRECT_URL || env.DATABASE_URL;
}
