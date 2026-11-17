import { describe, expect, it } from "vitest";
import { isTransactionPooler, migrationUrl, postgresOptions } from "@/db/connection";

const LOCAL = "postgres://tostov:tostov@localhost:5432/tostov";
const SUPABASE_POOLER = "postgres://postgres.abcd:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const SUPABASE_DIRECT = "postgres://postgres:secret@db.abcd.supabase.co:5432/postgres";
const SUPABASE_SESSION = "postgres://postgres.abcd:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";

describe("postgresOptions", () => {
  it("keeps a local database plain: no SSL, prepared statements on", () => {
    expect(postgresOptions(LOCAL)).toEqual({});
    expect(postgresOptions("postgres://u:p@127.0.0.1:5432/db")).toEqual({});
  });

  it("requires SSL for a hosted database", () => {
    expect(postgresOptions(SUPABASE_DIRECT).ssl).toBe("require");
    expect(postgresOptions(SUPABASE_SESSION).ssl).toBe("require");
  });

  it("turns prepared statements off for the Supabase transaction pooler (port 6543)", () => {
    expect(postgresOptions(SUPABASE_POOLER)).toMatchObject({ ssl: "require", prepare: false });
  });

  it("keeps prepared statements for direct and session connections", () => {
    expect(postgresOptions(SUPABASE_DIRECT).prepare).toBeUndefined();
    expect(postgresOptions(SUPABASE_SESSION).prepare).toBeUndefined();
  });

  it("respects an sslmode written in the address", () => {
    expect(postgresOptions(`${SUPABASE_DIRECT}?sslmode=disable`).ssl).toBeUndefined();
  });

  it("recognises a pooler flagged with ?pgbouncer=true", () => {
    expect(postgresOptions(`${SUPABASE_SESSION}?pgbouncer=true`).prepare).toBe(false);
  });

  it("keeps the options the caller passes", () => {
    expect(postgresOptions(LOCAL, { max: 1 })).toEqual({ max: 1 });
    expect(postgresOptions(SUPABASE_POOLER, { max: 3 })).toMatchObject({ max: 3, prepare: false });
  });
});

describe("isTransactionPooler", () => {
  it("is true only for port 6543 or pgbouncer=true", () => {
    expect(isTransactionPooler(SUPABASE_POOLER)).toBe(true);
    expect(isTransactionPooler(SUPABASE_SESSION)).toBe(false);
    expect(isTransactionPooler(LOCAL)).toBe(false);
  });
});

describe("migrationUrl", () => {
  it("prefers DIRECT_URL, because migrations need a real session", () => {
    expect(migrationUrl({ DATABASE_URL: SUPABASE_POOLER, DIRECT_URL: SUPABASE_DIRECT })).toBe(SUPABASE_DIRECT);
  });
  it("falls back to DATABASE_URL", () => {
    expect(migrationUrl({ DATABASE_URL: LOCAL })).toBe(LOCAL);
    expect(migrationUrl({ DATABASE_URL: LOCAL, DIRECT_URL: "" })).toBe(LOCAL);
  });
  it("is undefined when nothing is set", () => {
    expect(migrationUrl({})).toBeUndefined();
  });
});
