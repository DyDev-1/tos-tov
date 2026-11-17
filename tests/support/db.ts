import { sql } from "drizzle-orm";
import { db } from "@/db";
import { seed, seedSamplePlaces } from "@/db/seed";

// Helpers for integration tests. `db` here points at the test database (see vitest.config.mts).

export async function resetDatabase() {
  await db.execute(sql`truncate table provinces, categories, users restart identity cascade`);
}

export async function resetAndSeed() {
  await resetDatabase();
  await seed(db);
}

export async function resetAndSeedPlaces() {
  await resetDatabase();
  await seedSamplePlaces(db);
}

export { db };
