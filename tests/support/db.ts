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

import { users } from "@/db/schema";

// Make a regular test user (like someone who just logged in).
export async function createTestUser(name = "Test User") {
  const [user] = await db
    .insert(users)
    .values({ clerkId: `test:${Math.random().toString(36).slice(2)}`, name })
    .returning();
  return user;
}

export { db };
