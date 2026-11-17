import "server-only";
import { and, count, eq, gt, ilike, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, photos, places, provinces, type UserRow } from "@/db/schema";
import { localizeInput, slugify } from "@/lib/i18n-content";
import { publicPhotoBase } from "@/lib/r2";
import { publishesWithoutApproval } from "@/lib/release-stage";
import type { PlaceDetails } from "@/lib/validation/place-details";
import type { CreatePlaceInput } from "@/lib/validation/place-input";

// Adding a place. CLAUDE.md rules this follows:
//  - search first: a place that already exists (same spot or same name) is offered instead;
//  - release stage 3: new places wait for an admin ("pending"); admins publish at once;
//  - rate limit on posting: 5 new places per person per hour.

const PLACES_PER_HOUR = 5;
const DUPLICATE_RADIUS_METERS = 150;

export type CreatePlaceResult =
  | { ok: true; place: { id: number; slug: string; status: "pending" | "published" } }
  | { ok: false; reason: "rate_limited" | "invalid_reference" | "invalid_photos" }
  | { ok: false; reason: "possible_duplicate"; duplicate: { slug: string; name: { en: string; km: string } } };

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "place";
  const taken = new Set(
    (await db.select({ slug: places.slug }).from(places).where(like(places.slug, `${base}%`))).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; n < 50; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createPlace(user: UserRow, input: CreatePlaceInput): Promise<CreatePlaceResult> {
  const isAdmin = user.role === "admin";

  if (!isAdmin) {
    const [recent] = await db
      .select({ n: count() })
      .from(places)
      .where(and(eq(places.createdById, user.id), gt(places.createdAt, sql`now() - interval '1 hour'`)));
    if ((recent?.n ?? 0) >= PLACES_PER_HOUR) return { ok: false, reason: "rate_limited" };
  }

  // Photos must be files we stored ourselves. Otherwise anyone could point a place at any web address.
  const photoBase = publicPhotoBase();
  if (!photoBase || !input.photos.every((url) => url.startsWith(`${photoBase}/`))) {
    return { ok: false, reason: "invalid_photos" };
  }

  const [[province], [category]] = await Promise.all([
    db.select({ id: provinces.id }).from(provinces).where(eq(provinces.slug, input.provinceSlug)).limit(1),
    db.select({ id: categories.id }).from(categories).where(eq(categories.slug, input.categorySlug)).limit(1),
  ]);
  if (!province || !category) return { ok: false, reason: "invalid_reference" };

  if (!input.allowDuplicate) {
    const point = sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`;
    const [duplicate] = await db
      .select({ slug: places.slug, nameEn: places.nameEn, nameKm: places.nameKm })
      .from(places)
      .where(
        and(
          eq(places.status, "published"),
          or(
            sql`ST_DWithin(${places.location}::geography, ${point}, ${DUPLICATE_RADIUS_METERS})`,
            and(eq(places.provinceId, province.id), or(ilike(places.nameEn, input.name), ilike(places.nameKm, input.name))),
          ),
        ),
      )
      .limit(1);
    if (duplicate) {
      return {
        ok: false,
        reason: "possible_duplicate",
        duplicate: { slug: duplicate.slug, name: { en: duplicate.nameEn, km: duplicate.nameKm } },
      };
    }
  }

  const description = localizeInput(input.description);
  const whatToBring = localizeInput(input.whatToBring);
  const details: PlaceDetails = whatToBring ? { whatToBring } : {};
  const slug = await uniqueSlug(input.name);
  // Admins publish at once. At release stage 4 so do trusted people. Everyone else waits for an admin.
  const status = publishesWithoutApproval(user) ? "published" : "pending";

  const created = await db.transaction(async (tx) => {
    const [place] = await tx
      .insert(places)
      .values({
        slug,
        // The person typed the name in one language. It fills both until an admin adds a translation.
        nameEn: input.name,
        nameKm: input.name,
        descriptionEn: description?.en ?? null,
        descriptionKm: description?.km ?? null,
        provinceId: province.id,
        categoryId: category.id,
        location: sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)` as unknown as { x: number; y: number },
        entryFeeKhr: input.entryFeeKhr ?? null,
        entryFeeUsd: input.entryFeeUsd ?? null,
        bestMonths: input.bestMonths,
        details,
        status,
        createdById: user.id,
      })
      .returning({ id: places.id, slug: places.slug, status: places.status });

    await tx.insert(photos).values(
      input.photos.map((url, index) => ({ placeId: place.id, url, sortOrder: index, createdById: user.id })),
    );
    return place;
  });

  return { ok: true, place: { id: created.id, slug: created.slug, status: created.status as "pending" | "published" } };
}
