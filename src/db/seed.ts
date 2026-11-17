import { and, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { categorySeed, provinceSeed, type SeedItem } from "./seed-data";
import { seedComments, seedGuides, seedPlaces, seedPosts, seedUsers } from "./seed-places";

type Db = PostgresJsDatabase<typeof schema>;

const withOrder = (items: SeedItem[]) => items.map((item, i) => ({ ...item, sortOrder: i + 1 }));

// Safe to run many times: rows are matched by slug, so running it again
// updates names and order instead of creating duplicates ("upsert").
export async function seed(db: Db) {
  await seedReference(db);
}

async function seedReference(db: Db) {
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

// Sample places, demo users, comments and guides. Run by `npm run db:seed`, and by tests that need places.
export async function seedSamplePlaces(db: Db) {
  await seedReference(db);

  const userRows = await db
    .insert(schema.users)
    .values(seedUsers.map((u) => ({ clerkId: `seed:${u.key}`, name: u.name })))
    .onConflictDoUpdate({ target: schema.users.clerkId, set: { name: sql`excluded.name`, updatedAt: sql`now()` } })
    .returning();
  const userId = Object.fromEntries(userRows.map((u) => [u.clerkId.replace("seed:", ""), u.id]));

  const provinceRows = await db.select().from(schema.provinces);
  const categoryRows = await db.select().from(schema.categories);
  const provinceId = Object.fromEntries(provinceRows.map((p) => [p.slug, p.id]));
  const categoryId = Object.fromEntries(categoryRows.map((c) => [c.slug, c.id]));

  for (const p of seedPlaces) {
    const values = {
      slug: p.slug,
      nameEn: p.nameEn,
      nameKm: p.nameKm,
      taglineEn: p.taglineEn,
      taglineKm: p.taglineKm,
      descriptionEn: p.descriptionEn,
      descriptionKm: p.descriptionKm,
      provinceId: provinceId[p.province],
      categoryId: categoryId[p.category],
      location: sql`ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)` as unknown as { x: number; y: number },
      entryFeeKhr: p.entryFeeKhr ?? null,
      entryFeeUsd: p.entryFeeUsd ?? null,
      bestMonths: p.bestMonths,
      avoidMonths: p.avoidMonths,
      details: p.details,
      status: "published" as const,
    };
    // On a re-run, update the facts but keep likes, creation time and author as they are.
    const updatable = Object.fromEntries(Object.entries(values).filter(([key]) => key !== "slug"));
    await db
      .insert(schema.places)
      .values({
        ...values,
        likesCount: p.likesCount,
        createdById: userId[p.addedBy],
        createdAt: sql`now() - make_interval(hours => ${p.hoursAgo})` as unknown as Date,
      })
      .onConflictDoUpdate({ target: schema.places.slug, set: { ...updatable, updatedAt: sql`now()` } });
  }

  const placeRows = await db.select().from(schema.places);
  const placeId = Object.fromEntries(placeRows.map((p) => [p.slug, p.id]));
  const seededPlaceIds = seedPlaces.map((p) => placeId[p.slug]);

  // Comments and guides are replaced on every run, so editing the seed file takes effect.
  await db
    .delete(schema.comments)
    .where(
      and(
        inArray(schema.comments.placeId, seededPlaceIds),
        inArray(schema.comments.userId, Object.values(userId)),
      ),
    );
  await db.insert(schema.comments).values(
    seedComments.map((c) => ({
      placeId: placeId[c.place],
      userId: userId[c.user],
      body: c.body,
      createdAt: sql`now() - make_interval(hours => ${c.hoursAgo})` as unknown as Date,
    })),
  );

  // Sample posts are replaced on every run too (their photos go with them).
  await db
    .delete(schema.posts)
    .where(and(inArray(schema.posts.placeId, seededPlaceIds), inArray(schema.posts.userId, Object.values(userId))));
  await db.insert(schema.posts).values(
    seedPosts.map((p) => ({
      placeId: placeId[p.place],
      userId: userId[p.user],
      story: p.story,
      rating: p.rating,
      visitedAt: p.visitedAt,
      status: "published" as const,
      createdAt: sql`now() - make_interval(days => ${p.daysAgo})` as unknown as Date,
    })),
  );

  await db.delete(schema.guides).where(inArray(schema.guides.placeId, seededPlaceIds));
  await db.insert(schema.guides).values(
    seedGuides.map((g) => ({
      placeId: placeId[g.place],
      name: g.name,
      tourEn: g.tourEn,
      tourKm: g.tourKm,
      priceText: g.priceText,
      contactType: g.contactType,
      contactValue: g.contactValue,
    })),
  );
}
