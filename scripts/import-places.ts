// Run with: npm run db:import -- data/places.csv [--dry-run] [--update] [--pending] [--strict] [--admin-email=you@example.com]
// Reads a CSV (spreadsheet) or JSON file, checks every row, and adds the places. See data/README.md.
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrationUrl, postgresOptions } from "../src/db/connection";
import { runImport, type Issue } from "../src/db/import-places";
import * as schema from "../src/db/schema";

// ENV_FILE=.env.staging npm run db:import -- data/places.csv   targets another database
config({ path: process.env.ENV_FILE ?? ".env.local" });

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const file = args.find((a) => !a.startsWith("--"));

function print(title: string, issues: Issue[]) {
  if (issues.length === 0) return;
  console.log(`\n${title} (${issues.length})`);
  for (const issue of issues) console.log(`  ${issue.line > 0 ? `line ${issue.line}` : "file"}${issue.column ? `, ${issue.column}` : ""}: ${issue.message}`);
}

async function main() {
  if (!file) throw new Error("Give the file to import, for example: npm run db:import -- data/places.csv --dry-run");
  const url = migrationUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  const format = extname(file).toLowerCase() === ".json" ? "json" : "csv";

  const photoBase = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "") || null;
  const text = readFileSync(file, "utf8");

  const client = postgres(url, postgresOptions(url, { max: 1, onnotice: () => {} }));
  try {
    const db = drizzle(client, { schema });

    let adminId: number | undefined;
    const email = option("admin-email");
    if (email) {
      const [admin] = await db.select().from(schema.users).where(eq(schema.users.email, email));
      if (!admin || admin.role !== "admin") throw new Error(`No admin with the email ${email}. Log in once and make the person an admin first (see README).`);
      adminId = admin.id;
    }

    // --strict: look first without writing; write only when there are no warnings either.
    const options = { update: flag("update"), pending: flag("pending"), adminId, photoBase };
    let result = await runImport(db, text, format, { ...options, dryRun: true });
    const clean = result.problems.length === 0 && !(flag("strict") && result.notes.length > 0);
    if (clean && !flag("dry-run")) result = await runImport(db, text, format, options);

    const { problems, notes: allNotes } = result;
    const notes = allNotes;
    print("PROBLEMS: nothing was written until these are fixed", problems);
    print("WARNINGS: worth a look", notes);

    console.log(`\n${result.rowCount} rows read from ${file}`);
    console.log(`  would add:    ${result.created.length}`);
    console.log(`  would update: ${result.updated.length}${flag("update") ? "" : "  (existing places are left alone; add --update to change them)"}`);
    console.log(`  skipped:      ${result.skipped.length}`);

    if (problems.length > 0) process.exitCode = 1;
    else if (flag("strict") && notes.length > 0) {
      console.log("\n--strict: there are warnings, so nothing was written.");
      process.exitCode = 1;
    } else if (flag("dry-run")) console.log("\nDry run: nothing was written.");
    else console.log(`\nDone: ${result.created.length} added, ${result.updated.length} updated.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
