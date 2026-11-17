import "server-only";
import { and, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { photos, places, posts, users, type UserRow } from "@/db/schema";
import { publicPhotoBase } from "@/lib/r2";
import type { CreatePostInput, Post, RatingSummary } from "@/lib/validation/posts";

// Posts: people's experiences of a place. CLAUDE.md rules this follows:
//  - release stage 3: a new post waits for an admin ("pending"); admins publish at once;
//  - rate limit on posting: 5 posts per person per hour;
//  - only published posts (and their photos) are public.

const POSTS_PER_HOUR = 5;

async function publishedPlaceId(slug: string): Promise<number | null> {
  const [row] = await db
    .select({ id: places.id })
    .from(places)
    .where(and(eq(places.slug, slug), eq(places.status, "published")))
    .limit(1);
  return row?.id ?? null;
}

export type CreatePostResult =
  | { ok: true; post: { id: number; status: "pending" | "published" } }
  | { ok: false; reason: "not_found" | "rate_limited" | "invalid_photos" };

export async function createPost(user: UserRow, slug: string, input: CreatePostInput): Promise<CreatePostResult> {
  const placeId = await publishedPlaceId(slug);
  if (!placeId) return { ok: false, reason: "not_found" };
  const isAdmin = user.role === "admin";

  if (!isAdmin) {
    const [recent] = await db
      .select({ n: count() })
      .from(posts)
      .where(and(eq(posts.userId, user.id), gt(posts.createdAt, sql`now() - interval '1 hour'`)));
    if ((recent?.n ?? 0) >= POSTS_PER_HOUR) return { ok: false, reason: "rate_limited" };
  }

  // Photos must be files we stored ourselves.
  if (input.photos.length > 0) {
    const base = publicPhotoBase();
    if (!base || !input.photos.every((url) => url.startsWith(`${base}/`))) return { ok: false, reason: "invalid_photos" };
  }

  const status = isAdmin ? "published" : "pending";
  const created = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({ placeId, userId: user.id, story: input.story, rating: input.rating, visitedAt: input.visitedAt, status })
      .returning({ id: posts.id, status: posts.status });
    if (input.photos.length > 0) {
      await tx.insert(photos).values(
        input.photos.map((url, index) => ({ placeId, postId: post.id, url, sortOrder: index, createdById: user.id })),
      );
    }
    return post;
  });
  return { ok: true, post: { id: created.id, status: created.status as "pending" | "published" } };
}

export async function listPosts(slug: string, query: { limit: number; offset: number }) {
  const placeId = await publishedPlaceId(slug);
  if (!placeId) return null;
  const where = and(eq(posts.placeId, placeId), eq(posts.status, "published"));

  const [rows, total] = await Promise.all([
    db
      .select({
        id: posts.id,
        story: posts.story,
        rating: posts.rating,
        visitedAt: posts.visitedAt,
        createdAt: posts.createdAt,
        name: users.name,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(where)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ n: count() }).from(posts).where(where),
  ]);

  const postPhotos = rows.length
    ? await db
        .select({ postId: photos.postId, url: photos.url })
        .from(photos)
        .where(inArray(photos.postId, rows.map((r) => r.id)))
        .orderBy(photos.sortOrder, photos.id)
    : [];

  const items: Post[] = rows.map((row) => ({
    id: row.id,
    story: row.story,
    rating: row.rating,
    visitedAt: row.visitedAt,
    createdAt: row.createdAt.toISOString(),
    author: { name: row.name },
    photos: postPhotos.filter((p) => p.postId === row.id).map((p) => ({ url: p.url })),
  }));
  return { items, total: total[0]?.n ?? 0 };
}

// Average of the published ratings, to one decimal place. null when nobody has rated yet.
export async function getRatingSummary(placeId: number): Promise<RatingSummary> {
  const [row] = await db
    .select({ average: sql<string | null>`round(avg(${posts.rating})::numeric, 1)`, n: count() })
    .from(posts)
    .where(and(eq(posts.placeId, placeId), eq(posts.status, "published")));
  return { average: row?.average ? Number(row.average) : null, count: row?.n ?? 0 };
}
