// Run with: npm run db:check
// Checks the database in DIRECT_URL (or DATABASE_URL): PostGIS, row-level security, migrations.
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";
import { migrationUrl, postgresOptions } from "../src/db/connection";
import { runDatabaseChecks } from "../src/db/checks";

// ENV_FILE=.env.staging npm run db:migrate  targets another database without touching .env.local
config({ path: process.env.ENV_FILE ?? ".env.local" });

async function main() {
  const url = migrationUrl();
  if (!url) throw new Error("DATABASE_URL is not set");

  const host = new URL(url).host;
  console.log(`Checking ${host}\n`);

  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: unknown[] };
  const sql = postgres(url, postgresOptions(url, { max: 1, onnotice: () => {} }));
  try {
    const checks = await runDatabaseChecks(sql, journal.entries.length);
    for (const check of checks) console.log(`${check.ok ? "OK  " : "FAIL"}  ${check.name}: ${check.detail}`);
    if (checks.some((check) => !check.ok)) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
