import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { categorySeed, provinceSeed, type SeedItem } from "./seed-data";

type Db = PostgresJsDatabase<typeof schema>;

const withOrder = (items: SeedItem[]) => items.map((item, i) => ({ ...item, sortOrder: i + 1 }));

// Safe to run many times: rows are matched by slug, so running it again
// updates names and order instead of creating duplicates ("upsert").
export async function seed(db: Db) {
  const upsert = {
    nameEn: sql`excluded.name_en`,
    nameKm: sql`excluded.name_km`,
    sortOrder: sql`excluded.sort_order`,
    updatedAt: sql`now()`,
  };

  await db
    .insert(schema.provinces)
    .values(withOrder(provinceSeed))
    .onConflictDoUpdate({ target: schema.provinces.slug, set: upsert });

  await db
    .insert(schema.categories)
    .values(withOrder(categorySeed))
    .onConflictDoUpdate({ target: schema.categories.slug, set: upsert });
}
