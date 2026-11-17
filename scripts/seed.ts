// Run with: npm run db:seed
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { seed, seedSamplePlaces } from "../src/db/seed";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

async function main(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(client, { schema });
    await seed(db);
    await seedSamplePlaces(db);
    console.log("Seeded provinces, categories and sample places.");
  } finally {
    await client.end();
  }
}

main(url).catch((error) => {
  console.error(error);
  process.exit(1);
});
