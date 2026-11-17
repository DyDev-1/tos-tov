// Run with: npm run db:seed
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { migrationUrl, postgresOptions } from "../src/db/connection";
import { seed, seedSamplePlaces } from "../src/db/seed";

// ENV_FILE=.env.staging npm run db:migrate  targets another database without touching .env.local
config({ path: process.env.ENV_FILE ?? ".env.local" });

const url = migrationUrl();
if (!url) throw new Error("DATABASE_URL is not set");

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "db"]);

async function main(databaseUrl: string) {
  // Reference data (provinces, categories) is safe everywhere. Sample places have demo guides with fake
  // contacts, so they only go into a local database, unless you add --with-samples on purpose (staging).
  const local = LOCAL_HOSTS.has(new URL(databaseUrl).hostname);
  const referenceOnly = process.argv.includes("--reference-only");
  const withSamples = !referenceOnly && (local || process.argv.includes("--with-samples"));
  if (!referenceOnly && !withSamples) {
    throw new Error(
      "Refusing to add demo places to a hosted database. Use `npm run db:seed:reference` for provinces and categories only, or add --with-samples if this is staging.",
    );
  }

  const client = postgres(databaseUrl, postgresOptions(databaseUrl, { max: 1 }));
  try {
    const db = drizzle(client, { schema });
    await seed(db);
    if (withSamples) await seedSamplePlaces(db);
    console.log(withSamples ? "Seeded provinces, categories and sample places." : "Seeded provinces and categories.");
  } finally {
    await client.end();
  }
}

main(url).catch((error) => {
  console.error(error);
  process.exit(1);
});
