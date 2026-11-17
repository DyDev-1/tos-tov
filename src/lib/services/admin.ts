import "server-only";
import { and, asc, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  adminActions,
  categories,
  comments,
  guides,
  photos,
  places,
  posts,
  provinces,
  reports,
  users,
  type UserRow,
} from "@/db/schema";
import type { AdminListQuery, CategoryInput, GuideInput, UpdatePlaceInput } from "@/lib/validation/admin";

// Everything an admin can do. CLAUDE.md rules this follows:
//  - the public API and the admin API call the same services;
//  - every change writes a row to admin_actions, inside the same transaction as the change,
//    so there is never a change without a log line, nor a log line for a change that failed;
//  - admin shapes are written out field by field (never a raw database row).
// The caller (route or page) has already checked that the person is an admin.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Result<T = void> = ({ ok: true } & (T extends void ? object : { value: T })) | { ok: false; reason: string };
const ok = (): { ok: true } => ({ ok: true });

async function log(tx: Tx, admin: UserRow, action: string, targetType: string, targetId: number | null, details: Record<string, unknown> = {}) {
  await tx.insert(adminActions).values({ adminId: admin.id, action, targetType, targetId, details });
}

const like = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// ---------------------------------------------------------------- Overview

export async function getAdminOverview() {
  const one = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
  const [pendingPlaces, pendingPosts, openReports, totalPlaces, totalUsers, bannedUsers] = await Promise.all([
    one(db.select({ n: count() }).from(places).where(eq(places.status, "pending"))),
    one(db.select({ n: count() }).from(posts).where(eq(posts.status, "pending"))),
    one(db.select({ n: count() }).from(reports).where(eq(reports.status, "open"))),
    one(db.select({ n: count() }).from(places).where(eq(places.status, "published"))),
    one(db.select({ n: count() }).from(users)),
    one(db.select({ n: count() }).from(users).where(sql`${users.bannedAt} is not null`)),
  ]);
  return { pendingPlaces, pendingPosts, openReports, totalPlaces, totalUsers, bannedUsers };
}

// ---------------------------------------------------------------- Places

export type AdminPlaceRow = {
  id: number;
  slug: string;
  name: { en: string; km: string };
  province: { slug: string; name: { en: string; km: string } };
  category: { slug: string; name: { en: string; km: string } };
  status: "pending" | "published" | "hidden";
  mergedInto: number | null;
  addedBy: string | null;
  createdAt: string;
};

const placeRowColumns = {
  id: places.id,
  slug: places.slug,
  nameEn: places.nameEn,
  nameKm: places.nameKm,
  status: places.status,
  parentPlaceId: places.parentPlaceId,
  createdAt: places.createdAt,
  provinceSlug: provinces.slug,
  provinceNameEn: provinces.nameEn,
  provinceNameKm: provinces.nameKm,
  categorySlug: categories.slug,
  categoryNameEn: categories.nameEn,
  categoryNameKm: categories.nameKm,
  addedBy: users.name,
};

export async function listAdminPlaces(query: AdminListQuery & { status?: "pending" | "published" | "hidden" }) {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(places.status, query.status));
  if (query.q) conditions.push(or(ilike(places.nameEn, like(query.q)), ilike(places.nameKm, like(query.q)), ilike(places.slug, like(query.q)))!);
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select(placeRowColumns)
      .from(places)
      .innerJoin(provinces, eq(places.provinceId, provinces.id))
      .innerJoin(categories, eq(places.categoryId, categories.id))
      .leftJoin(users, eq(places.createdById, users.id))
      .where(where)
      .orderBy(desc(places.createdAt), desc(places.id))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ n: count() }).from(places).where(where),
  ]);

  const items: AdminPlaceRow[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: { en: r.nameEn, km: r.nameKm },
    province: { slug: r.provinceSlug, name: { en: r.provinceNameEn, km: r.provinceNameKm } },
    category: { slug: r.categorySlug, name: { en: r.categoryNameEn, km: r.categoryNameKm } },
    status: r.status,
    mergedInto: r.parentPlaceId,
    addedBy: r.addedBy,
    createdAt: r.createdAt.toISOString(),
  }));
  return { items, total: total[0]?.n ?? 0 };
}

// Everything the edit form needs, including hidden and pending places.
export async function getAdminPlace(id: number) {
  const [row] = await db
    .select({
      ...placeRowColumns,
      location: places.location,
      taglineEn: places.taglineEn,
      taglineKm: places.taglineKm,
      descriptionEn: places.descriptionEn,
      descriptionKm: places.descriptionKm,
      entryFeeKhr: places.entryFeeKhr,
      entryFeeUsd: places.entryFeeUsd,
      bestMonths: places.bestMonths,
      avoidMonths: places.avoidMonths,
      details: places.details,
      likesCount: places.likesCount,
    })
    .from(places)
    .innerJoin(provinces, eq(places.provinceId, provinces.id))
    .innerJoin(categories, eq(places.categoryId, categories.id))
    .leftJoin(users, eq(places.createdById, users.id))
    .where(eq(places.id, id))
    .limit(1);
  if (!row) return null;

  const [guideRows, photoRows] = await Promise.all([
    db.select().from(guides).where(eq(guides.placeId, id)).orderBy(asc(guides.id)),
    db.select({ id: photos.id, url: photos.url, postId: photos.postId }).from(photos).where(eq(photos.placeId, id)).orderBy(asc(photos.sortOrder), asc(photos.id)),
  ]);

  return {
    id: row.id,
    slug: row.slug,
    name: { en: row.nameEn, km: row.nameKm },
    tagline: { en: row.taglineEn, km: row.taglineKm },
    description: { en: row.descriptionEn, km: row.descriptionKm },
    province: { slug: row.provinceSlug, name: { en: row.provinceNameEn, km: row.provinceNameKm } },
    category: { slug: row.categorySlug, name: { en: row.categoryNameEn, km: row.categoryNameKm } },
    location: { lat: row.location.y, lng: row.location.x },
    entryFee: { khr: row.entryFeeKhr, usd: row.entryFeeUsd },
    bestMonths: row.bestMonths,
    avoidMonths: row.avoidMonths,
    details: row.details,
    status: row.status,
    mergedInto: row.parentPlaceId,
    likesCount: row.likesCount,
    addedBy: row.addedBy,
    createdAt: row.createdAt.toISOString(),
    guides: guideRows.map((g) => ({
      id: g.id,
      name: g.name,
      tour: { en: g.tourEn, km: g.tourKm },
      priceText: g.priceText,
      contactType: g.contactType,
      contactValue: g.contactValue,
    })),
    photos: photoRows.map((p) => ({ id: p.id, url: p.url, fromPost: p.postId !== null })),
  };
}

export async function setPlaceStatus(admin: UserRow, id: number, status: "published" | "hidden"): Promise<Result> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ status: places.status }).from(places).where(eq(places.id, id)).for("update");
    if (!row) return { ok: false, reason: "not_found" };
    await tx.update(places).set({ status, updatedAt: sql`now()` }).where(eq(places.id, id));
    // "approve" for something waiting, "hide" to take it down, "unhide" to bring it back.
    const action = status === "hidden" ? "place.hide" : row.status === "pending" ? "place.approve" : "place.unhide";
    await log(tx, admin, action, "place", id, { from: row.status, to: status });
    return ok();
  });
}

export async function updatePlace(admin: UserRow, id: number, input: UpdatePlaceInput): Promise<Result> {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: places.id }).from(places).where(eq(places.id, id));
    if (!existing) return { ok: false, reason: "not_found" };

    const set: Record<string, unknown> = { updatedAt: sql`now()` };
    const { provinceSlug, categorySlug, lat, lng, ...plain } = input;
    for (const [key, value] of Object.entries(plain)) if (value !== undefined) set[key] = value;

    if (provinceSlug) {
      const [p] = await tx.select({ id: provinces.id }).from(provinces).where(eq(provinces.slug, provinceSlug));
      if (!p) return { ok: false, reason: "invalid_reference" };
      set.provinceId = p.id;
    }
    if (categorySlug) {
      const [c] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug));
      if (!c) return { ok: false, reason: "invalid_reference" };
      set.categoryId = c.id;
    }
    if (lat !== undefined && lng !== undefined) set.location = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;

    await tx.update(places).set(set).where(eq(places.id, id));
    await log(tx, admin, "place.update", "place", id, { fields: Object.keys(input) });
    return ok();
  });
}

// Merge a duplicate into the place that stays. Everything of the duplicate moves over, the duplicate is
// hidden, and its old web address sends visitors to the place that stays.
export async function mergePlaces(admin: UserRow, duplicateId: number, targetId: number): Promise<Result> {
  if (duplicateId === targetId) return { ok: false, reason: "same_place" };

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: places.id, slug: places.slug, status: places.status, parentPlaceId: places.parentPlaceId, likesCount: places.likesCount })
      .from(places)
      .where(or(eq(places.id, duplicateId), eq(places.id, targetId)))
      .orderBy(asc(places.id))
      .for("update");
    const duplicate = rows.find((r) => r.id === duplicateId);
    const target = rows.find((r) => r.id === targetId);
    if (!duplicate || !target) return { ok: false, reason: "not_found" };
    if (duplicate.parentPlaceId !== null) return { ok: false, reason: "already_merged" };
    if (target.parentPlaceId !== null || target.status === "hidden") return { ok: false, reason: "target_unavailable" };

    // Move what belongs to the place.
    for (const table of [photos, posts, comments, guides, reports]) {
      await tx.update(table).set({ placeId: targetId }).where(eq(table.placeId, duplicateId));
    }

    // Likes and saves: one person keeps one like and one save, even if they had both places.
    const overlap = await tx.execute(
      sql`select count(*)::int as n from likes a join likes b on a.user_id = b.user_id where a.place_id = ${duplicateId} and b.place_id = ${targetId}`,
    );
    await tx.execute(sql`insert into likes (place_id, user_id, created_at) select ${targetId}, user_id, created_at from likes where place_id = ${duplicateId} on conflict do nothing`);
    await tx.execute(sql`delete from likes where place_id = ${duplicateId}`);
    await tx.execute(sql`insert into saves (place_id, user_id, created_at) select ${targetId}, user_id, created_at from saves where place_id = ${duplicateId} on conflict do nothing`);
    await tx.execute(sql`delete from saves where place_id = ${duplicateId}`);

    const shared = Number((overlap as unknown as { n: number }[])[0]?.n ?? 0);
    await tx
      .update(places)
      .set({ likesCount: sql`greatest(${places.likesCount} + ${duplicate.likesCount} - ${shared}, 0)`, updatedAt: sql`now()` })
      .where(eq(places.id, targetId));
    await tx
      .update(places)
      .set({ status: "hidden", parentPlaceId: targetId, likesCount: 0, updatedAt: sql`now()` })
      .where(eq(places.id, duplicateId));

    await log(tx, admin, "place.merge", "place", targetId, { mergedId: duplicateId, mergedSlug: duplicate.slug });
    return ok();
  });
}

// A hidden duplicate remembers where it went. Used to redirect its old web address.
export async function resolveMergedPlaceSlug(slug: string): Promise<string | null> {
  let current = slug;
  for (let hop = 0; hop < 5; hop++) {
    const [row] = await db
      .select({ parentId: places.parentPlaceId })
      .from(places)
      .where(eq(places.slug, current));
    if (!row || row.parentId === null) return current === slug ? null : current;
    const [parent] = await db.select({ slug: places.slug, status: places.status, parentId: places.parentPlaceId }).from(places).where(eq(places.id, row.parentId));
    if (!parent) return null;
    if (parent.parentId === null) return parent.status === "published" ? parent.slug : null;
    current = parent.slug;
  }
  return null;
}

// ---------------------------------------------------------------- Guides and photos

export async function createGuide(admin: UserRow, placeId: number, input: GuideInput): Promise<Result<{ id: number }>> {
  return db.transaction(async (tx) => {
    const [place] = await tx.select({ id: places.id }).from(places).where(eq(places.id, placeId));
    if (!place) return { ok: false, reason: "not_found" };
    const [guide] = await tx
      .insert(guides)
      .values({ placeId, name: input.name, tourEn: input.tourEn, tourKm: input.tourKm, priceText: input.priceText, contactType: input.contactType, contactValue: input.contactValue })
      .returning({ id: guides.id });
    await log(tx, admin, "guide.create", "guide", guide.id, { placeId, name: input.name });
    return { ok: true, value: { id: guide.id } };
  });
}

export async function updateGuide(admin: UserRow, id: number, input: GuideInput): Promise<Result> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(guides)
      .set({ name: input.name, tourEn: input.tourEn, tourKm: input.tourKm, priceText: input.priceText, contactType: input.contactType, contactValue: input.contactValue, updatedAt: sql`now()` })
      .where(eq(guides.id, id))
      .returning({ id: guides.id });
    if (updated.length === 0) return { ok: false, reason: "not_found" };
    await log(tx, admin, "guide.update", "guide", id, { name: input.name });
    return ok();
  });
}

export async function deleteGuide(admin: UserRow, id: number): Promise<Result> {
  return db.transaction(async (tx) => {
    const removed = await tx.delete(guides).where(eq(guides.id, id)).returning({ id: guides.id, name: guides.name });
    if (removed.length === 0) return { ok: false, reason: "not_found" };
    await log(tx, admin, "guide.delete", "guide", id, { name: removed[0].name });
    return ok();
  });
}

export async function deletePhoto(admin: UserRow, id: number): Promise<Result> {
  return db.transaction(async (tx) => {
    const removed = await tx.delete(photos).where(eq(photos.id, id)).returning({ id: photos.id, placeId: photos.placeId, url: photos.url });
    if (removed.length === 0) return { ok: false, reason: "not_found" };
    // Only the database row goes. The file stays in R2 until someone cleans the bucket.
    await log(tx, admin, "photo.delete", "photo", id, { placeId: removed[0].placeId, url: removed[0].url });
    return ok();
  });
}

// ---------------------------------------------------------------- Posts and comments

export async function listAdminPosts(query: AdminListQuery & { status?: "pending" | "published" | "hidden" }) {
  const where = query.status ? eq(posts.status, query.status) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select({
        id: posts.id,
        status: posts.status,
        rating: posts.rating,
        story: posts.story,
        visitedAt: posts.visitedAt,
        createdAt: posts.createdAt,
        authorId: users.id,
        authorName: users.name,
        placeSlug: places.slug,
        placeNameEn: places.nameEn,
        placeNameKm: places.nameKm,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .innerJoin(places, eq(posts.placeId, places.id))
      .where(where)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ n: count() }).from(posts).where(where),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      status: r.status,
      rating: r.rating,
      story: r.story,
      visitedAt: r.visitedAt,
      createdAt: r.createdAt.toISOString(),
      author: { id: r.authorId, name: r.authorName },
      place: { slug: r.placeSlug, name: { en: r.placeNameEn, km: r.placeNameKm } },
    })),
    total: total[0]?.n ?? 0,
  };
}

export async function setPostStatus(admin: UserRow, id: number, status: "published" | "hidden"): Promise<Result> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ status: posts.status }).from(posts).where(eq(posts.id, id)).for("update");
    if (!row) return { ok: false, reason: "not_found" };
    await tx.update(posts).set({ status, updatedAt: sql`now()` }).where(eq(posts.id, id));
    const action = status === "hidden" ? "post.hide" : row.status === "pending" ? "post.approve" : "post.unhide";
    await log(tx, admin, action, "post", id, { from: row.status, to: status });
    return ok();
  });
}

export async function listAdminComments(query: AdminListQuery & { status?: "published" | "hidden" }) {
  const where = query.status ? eq(comments.status, query.status) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select({
        id: comments.id,
        status: comments.status,
        body: comments.body,
        createdAt: comments.createdAt,
        authorId: users.id,
        authorName: users.name,
        placeSlug: places.slug,
        placeNameEn: places.nameEn,
        placeNameKm: places.nameKm,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .innerJoin(places, eq(comments.placeId, places.id))
      .where(where)
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ n: count() }).from(comments).where(where),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      status: r.status,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      author: { id: r.authorId, name: r.authorName },
      place: { slug: r.placeSlug, name: { en: r.placeNameEn, km: r.placeNameKm } },
    })),
    total: total[0]?.n ?? 0,
  };
}

export async function setCommentStatus(admin: UserRow, id: number, status: "published" | "hidden"): Promise<Result> {
  return db.transaction(async (tx) => {
    const updated = await tx.update(comments).set({ status }).where(eq(comments.id, id)).returning({ id: comments.id });
    if (updated.length === 0) return { ok: false, reason: "not_found" };
    await log(tx, admin, status === "hidden" ? "comment.hide" : "comment.restore", "comment", id);
    return ok();
  });
}

// ---------------------------------------------------------------- Reports

export async function listAdminReports(query: AdminListQuery & { status?: "open" | "resolved" }) {
  const where = query.status ? eq(reports.status, query.status) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select({
        id: reports.id,
        reason: reports.reason,
        message: reports.message,
        status: reports.status,
        createdAt: reports.createdAt,
        reporterName: users.name,
        placeId: places.id,
        placeSlug: places.slug,
        placeNameEn: places.nameEn,
        placeNameKm: places.nameKm,
        placeStatus: places.status,
      })
      .from(reports)
      .innerJoin(users, eq(reports.userId, users.id))
      .innerJoin(places, eq(reports.placeId, places.id))
      .where(where)
      .orderBy(desc(reports.createdAt), desc(reports.id))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ n: count() }).from(reports).where(where),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporter: { name: r.reporterName },
      place: { id: r.placeId, slug: r.placeSlug, name: { en: r.placeNameEn, km: r.placeNameKm }, status: r.placeStatus },
    })),
    total: total[0]?.n ?? 0,
  };
}

export async function resolveReport(admin: UserRow, id: number): Promise<Result> {
  return db.transaction(async (tx) => {
    const updated = await tx.update(reports).set({ status: "resolved" }).where(eq(reports.id, id)).returning({ id: reports.id, placeId: reports.placeId });
    if (updated.length === 0) return { ok: false, reason: "not_found" };
    await log(tx, admin, "report.resolve", "report", id, { placeId: updated[0].placeId });
    return ok();
  });
}

// ---------------------------------------------------------------- Categories

export async function listAdminCategories() {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameKm: categories.nameKm,
      sortOrder: categories.sortOrder,
      // Written with the table name in full: a bare "id" would mean places.id inside the sub-query.
      placeCount: sql<number>`(select count(*)::int from ${places} where ${places.categoryId} = "categories"."id")`,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: { en: r.nameEn, km: r.nameKm }, sortOrder: r.sortOrder, placeCount: Number(r.placeCount) }));
}

export async function createCategory(admin: UserRow, input: CategoryInput): Promise<Result<{ id: number }>> {
  return db.transaction(async (tx) => {
    const [taken] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.slug, input.slug));
    if (taken) return { ok: false, reason: "slug_taken" };
    const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${categories.sortOrder}), 0) + 1` }).from(categories);
    const [created] = await tx
      .insert(categories)
      .values({ slug: input.slug, nameEn: input.nameEn, nameKm: input.nameKm, sortOrder: input.sortOrder ?? Number(next) })
      .returning({ id: categories.id });
    await log(tx, admin, "category.create", "category", created.id, { slug: input.slug });
    return { ok: true, value: { id: created.id } };
  });
}

export async function updateCategory(admin: UserRow, id: number, input: Partial<CategoryInput>): Promise<Result> {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.id, id));
    if (!existing) return { ok: false, reason: "not_found" };
    if (input.slug) {
      const [taken] = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.slug, input.slug), ne(categories.id, id)));
      if (taken) return { ok: false, reason: "slug_taken" };
    }
    await tx.update(categories).set({ ...input, updatedAt: sql`now()` }).where(eq(categories.id, id));
    await log(tx, admin, "category.update", "category", id, { fields: Object.keys(input) });
    return ok();
  });
}

// A category with places cannot be deleted: move or merge the places first.
export async function deleteCategory(admin: UserRow, id: number): Promise<Result> {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: categories.id, slug: categories.slug }).from(categories).where(eq(categories.id, id));
    if (!existing) return { ok: false, reason: "not_found" };
    const [used] = await tx.select({ n: count() }).from(places).where(eq(places.categoryId, id));
    if ((used?.n ?? 0) > 0) return { ok: false, reason: "in_use" };
    await tx.delete(categories).where(eq(categories.id, id));
    await log(tx, admin, "category.delete", "category", id, { slug: existing.slug });
    return ok();
  });
}

// ---------------------------------------------------------------- Users

export async function listAdminUsers(query: AdminListQuery & { status?: "banned" }) {
  const conditions: SQL[] = [];
  if (query.status === "banned") conditions.push(sql`${users.bannedAt} is not null`);
  if (query.q) conditions.push(or(ilike(users.name, like(query.q)), ilike(users.email, like(query.q)))!);
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db.select().from(users).where(where).orderBy(desc(users.createdAt), desc(users.id)).limit(query.limit).offset(query.offset),
    db.select({ n: count() }).from(users).where(where),
  ]);
  return {
    items: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      trusted: u.trusted,
      bannedAt: u.bannedAt?.toISOString() ?? null,
      bannedReason: u.bannedReason,
      createdAt: u.createdAt.toISOString(),
    })),
    total: total[0]?.n ?? 0,
  };
}

export async function banUser(admin: UserRow, id: number, reason: string): Promise<Result> {
  if (id === admin.id) return { ok: false, reason: "cannot_ban_yourself" };
  return db.transaction(async (tx) => {
    const [user] = await tx.select({ id: users.id, role: users.role, bannedAt: users.bannedAt }).from(users).where(eq(users.id, id)).for("update");
    if (!user) return { ok: false, reason: "not_found" };
    if (user.role === "admin") return { ok: false, reason: "cannot_ban_admin" };
    if (user.bannedAt) return { ok: false, reason: "already_banned" };
    // A banned person also loses their trusted status.
    await tx.update(users).set({ bannedAt: sql`now()`, bannedReason: reason, trusted: false, updatedAt: sql`now()` }).where(eq(users.id, id));
    await log(tx, admin, "user.ban", "user", id, { reason });
    return ok();
  });
}

export async function unbanUser(admin: UserRow, id: number): Promise<Result> {
  return db.transaction(async (tx) => {
    const [user] = await tx.select({ id: users.id, bannedAt: users.bannedAt }).from(users).where(eq(users.id, id)).for("update");
    if (!user) return { ok: false, reason: "not_found" };
    if (!user.bannedAt) return { ok: false, reason: "not_banned" };
    await tx.update(users).set({ bannedAt: null, bannedReason: null, updatedAt: sql`now()` }).where(eq(users.id, id));
    await log(tx, admin, "user.unban", "user", id);
    return ok();
  });
}

// Trusted people publish places and posts without waiting (release stage 4). Admins already do, and a
// banned person cannot be trusted.
export async function setUserTrusted(admin: UserRow, id: number, trusted: boolean): Promise<Result> {
  return db.transaction(async (tx) => {
    const [user] = await tx.select({ id: users.id, role: users.role, bannedAt: users.bannedAt, trusted: users.trusted }).from(users).where(eq(users.id, id)).for("update");
    if (!user) return { ok: false, reason: "not_found" };
    if (trusted) {
      if (user.role === "admin") return { ok: false, reason: "cannot_trust_admin" };
      if (user.bannedAt) return { ok: false, reason: "user_banned" };
      if (user.trusted) return { ok: false, reason: "already_trusted" };
    } else if (!user.trusted) {
      return { ok: false, reason: "not_trusted" };
    }
    await tx.update(users).set({ trusted, updatedAt: sql`now()` }).where(eq(users.id, id));
    await log(tx, admin, trusted ? "user.trust" : "user.untrust", "user", id);
    return ok();
  });
}

// ---------------------------------------------------------------- Audit log

export async function listAuditLog(query: { limit: number; offset: number; targetType?: string; targetId?: number }) {
  const conditions: SQL[] = [];
  if (query.targetType) conditions.push(eq(adminActions.targetType, query.targetType));
  if (query.targetId !== undefined) conditions.push(eq(adminActions.targetId, query.targetId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: adminActions.id,
        action: adminActions.action,
        targetType: adminActions.targetType,
        targetId: adminActions.targetId,
        details: adminActions.details,
        createdAt: adminActions.createdAt,
        adminName: users.name,
      })
      .from(adminActions)
      .innerJoin(users, eq(adminActions.adminId, users.id))
      .where(where)
      .orderBy(desc(adminActions.createdAt), desc(adminActions.id))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ n: count() }).from(adminActions).where(where),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      target: { type: r.targetType, id: r.targetId },
      details: r.details,
      admin: { name: r.adminName },
      createdAt: r.createdAt.toISOString(),
    })),
    total: total[0]?.n ?? 0,
  };
}
