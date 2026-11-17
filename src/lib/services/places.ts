import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, arrayContains, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, comments, guides, photos, places, provinces, users } from "@/db/schema";
import type { ListPlacesQuery, PlaceCard, PlaceDetail } from "@/lib/validation/places";

// Places: reading them for lists, the map and the place page.
// Only published places are public. Pending and hidden ones are for admins (a later slice).

// Columns shared by the list and the detail query.
const cardColumns = {
  id: places.id,
  slug: places.slug,
  nameEn: places.nameEn,
  nameKm: places.nameKm,
  taglineEn: places.taglineEn,
  taglineKm: places.taglineKm,
  location: places.location,
  likesCount: places.likesCount,
  bestMonths: places.bestMonths,
  createdAt: places.createdAt,
  provinceId: provinces.id,
  provinceSlug: provinces.slug,
  provinceNameEn: provinces.nameEn,
  provinceNameKm: provinces.nameKm,
  categoryId: categories.id,
  categorySlug: categories.slug,
  categoryNameEn: categories.nameEn,
  categoryNameKm: categories.nameKm,
  addedBy: users.name,
};

type CardRow = {
  id: number;
  slug: string;
  nameEn: string;
  nameKm: string;
  taglineEn: string | null;
  taglineKm: string | null;
  location: { x: number; y: number };
  likesCount: number;
  bestMonths: number[];
  createdAt: Date;
  provinceId: number;
  provinceSlug: string;
  provinceNameEn: string;
  provinceNameKm: string;
  categoryId: number;
  categorySlug: string;
  categoryNameEn: string;
  categoryNameKm: string;
  addedBy: string | null;
};

type Cover = { url: string; alt: string | null } | null;

// Map a database row to the public shape. Internal columns (status, createdById...) never leave here.
export function toPlaceCard(row: CardRow, coverPhoto: Cover): PlaceCard {
  return {
    id: row.id,
    slug: row.slug,
    name: { en: row.nameEn, km: row.nameKm },
    tagline: { en: row.taglineEn, km: row.taglineKm },
    province: { id: row.provinceId, slug: row.provinceSlug, name: { en: row.provinceNameEn, km: row.provinceNameKm } },
    category: { id: row.categoryId, slug: row.categorySlug, name: { en: row.categoryNameEn, km: row.categoryNameKm } },
    location: { lat: row.location.y, lng: row.location.x },
    likesCount: row.likesCount,
    bestMonths: row.bestMonths,
    coverPhoto,
    addedBy: row.addedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

// "%" and "_" are wildcards in LIKE. Escape them so a search for "50%" means exactly that.
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function coversFor(placeIds: number[]): Promise<Map<number, Cover>> {
  if (placeIds.length === 0) return new Map();
  const rows = await db
    .select({ placeId: photos.placeId, url: photos.url, alt: photos.alt })
    .from(photos)
    .where(inArray(photos.placeId, placeIds))
    .orderBy(asc(photos.sortOrder), asc(photos.id));
  const covers = new Map<number, Cover>();
  for (const row of rows) if (!covers.has(row.placeId)) covers.set(row.placeId, { url: row.url, alt: row.alt });
  return covers;
}

export async function listPlaces(query: ListPlacesQuery): Promise<{ items: PlaceCard[]; total: number }> {
  const conditions: SQL[] = [eq(places.status, "published")];
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    conditions.push(or(ilike(places.nameEn, pattern), ilike(places.nameKm, pattern))!);
  }
  if (query.province) conditions.push(eq(provinces.slug, query.province));
  if (query.category) conditions.push(eq(categories.slug, query.category));
  if (query.month) conditions.push(arrayContains(places.bestMonths, [query.month]));
  const where = and(...conditions);

  const orderBy =
    query.sort === "recent"
      ? [desc(places.createdAt)]
      : query.sort === "name"
        ? [asc(places.nameEn)]
        : [desc(places.likesCount), asc(places.nameEn)];

  const base = db
    .select(cardColumns)
    .from(places)
    .innerJoin(provinces, eq(places.provinceId, provinces.id))
    .innerJoin(categories, eq(places.categoryId, categories.id))
    .leftJoin(users, eq(places.createdById, users.id))
    .where(where);

  const [rows, totalRows] = await Promise.all([
    base.orderBy(...orderBy).limit(query.limit).offset(query.offset),
    db
      .select({ total: count() })
      .from(places)
      .innerJoin(provinces, eq(places.provinceId, provinces.id))
      .innerJoin(categories, eq(places.categoryId, categories.id))
      .where(where),
  ]);

  const covers = await coversFor(rows.map((r) => r.id));
  return {
    items: rows.map((row) => toPlaceCard(row as CardRow, covers.get(row.id) ?? null)),
    total: totalRows[0]?.total ?? 0,
  };
}

export async function getPlaceBySlug(slug: string): Promise<PlaceDetail | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      descriptionEn: places.descriptionEn,
      descriptionKm: places.descriptionKm,
      avoidMonths: places.avoidMonths,
      entryFeeKhr: places.entryFeeKhr,
      entryFeeUsd: places.entryFeeUsd,
      details: places.details,
      updatedAt: places.updatedAt,
    })
    .from(places)
    .innerJoin(provinces, eq(places.provinceId, provinces.id))
    .innerJoin(categories, eq(places.categoryId, categories.id))
    .leftJoin(users, eq(places.createdById, users.id))
    .where(and(eq(places.slug, slug), eq(places.status, "published")))
    .limit(1);
  if (!row) return null;

  const [photoRows, guideRows, commentCount] = await Promise.all([
    db
      .select({ id: photos.id, url: photos.url, alt: photos.alt })
      .from(photos)
      .where(eq(photos.placeId, row.id))
      .orderBy(asc(photos.sortOrder), asc(photos.id)),
    db.select().from(guides).where(eq(guides.placeId, row.id)).orderBy(asc(guides.id)),
    db
      .select({ total: count() })
      .from(comments)
      .where(and(eq(comments.placeId, row.id), eq(comments.status, "published"))),
  ]);

  const card = toPlaceCard(row as CardRow, photoRows[0] ? { url: photoRows[0].url, alt: photoRows[0].alt } : null);
  return {
    ...card,
    description: { en: row.descriptionEn, km: row.descriptionKm },
    avoidMonths: row.avoidMonths,
    entryFee: { khr: row.entryFeeKhr, usd: row.entryFeeUsd },
    details: row.details,
    photos: photoRows,
    guides: guideRows.map((g) => ({
      id: g.id,
      name: g.name,
      tour: { en: g.tourEn, km: g.tourKm },
      priceText: g.priceText,
      contactType: g.contactType,
      contactValue: g.contactValue,
    })),
    commentsCount: commentCount[0]?.total ?? 0,
    updatedAt: row.updatedAt.toISOString(),
  };
}
