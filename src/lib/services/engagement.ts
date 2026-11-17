import "server-only";
import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, likes, places, reports, saves, users } from "@/db/schema";
import type { Comment, ReportInput, ViewerState } from "@/lib/validation/engagement";

// Likes, saves, comments and reports. Every function takes the logged-in user's id
// (checked by the route) and a place slug. Only published places can be interacted with.

const COMMENT_LIMIT_PER_MINUTE = 5;

async function publishedPlaceId(slug: string): Promise<number | null> {
  const [row] = await db
    .select({ id: places.id })
    .from(places)
    .where(and(eq(places.slug, slug), eq(places.status, "published")))
    .limit(1);
  return row?.id ?? null;
}

export async function getViewerState(userId: number, slug: string): Promise<ViewerState | null> {
  const placeId = await publishedPlaceId(slug);
  if (!placeId) return null;
  const [liked, saved] = await Promise.all([
    db.select({ n: count() }).from(likes).where(and(eq(likes.placeId, placeId), eq(likes.userId, userId))),
    db.select({ n: count() }).from(saves).where(and(eq(saves.placeId, placeId), eq(saves.userId, userId))),
  ]);
  return { liked: (liked[0]?.n ?? 0) > 0, saved: (saved[0]?.n ?? 0) > 0 };
}

// Like or unlike. Safe to repeat: liking twice still counts once.
export async function setLike(userId: number, slug: string, on: boolean) {
  const placeId = await publishedPlaceId(slug);
  if (!placeId) return null;

  return db.transaction(async (tx) => {
    if (on) {
      const inserted = await tx.insert(likes).values({ placeId, userId }).onConflictDoNothing().returning();
      if (inserted.length > 0) {
        await tx.update(places).set({ likesCount: sql`${places.likesCount} + 1` }).where(eq(places.id, placeId));
      }
    } else {
      const removed = await tx
        .delete(likes)
        .where(and(eq(likes.placeId, placeId), eq(likes.userId, userId)))
        .returning();
      if (removed.length > 0) {
        await tx
          .update(places)
          .set({ likesCount: sql`greatest(${places.likesCount} - 1, 0)` })
          .where(eq(places.id, placeId));
      }
    }
    const [row] = await tx.select({ likesCount: places.likesCount }).from(places).where(eq(places.id, placeId));
    return { liked: on, likesCount: row.likesCount };
  });
}

export async function setSave(userId: number, slug: string, on: boolean) {
  const placeId = await publishedPlaceId(slug);
  if (!placeId) return null;
  if (on) await db.insert(saves).values({ placeId, userId }).onConflictDoNothing();
  else await db.delete(saves).where(and(eq(saves.placeId, placeId), eq(saves.userId, userId)));
  return { saved: on };
}

function toComment(row: { id: number; body: string; createdAt: Date; name: string }): Comment {
  return { id: row.id, body: row.body, createdAt: row.createdAt.toISOString(), author: { name: row.name } };
}

export async function listComments(slug: string, query: { limit: number; offset: number }) {
  const placeId = await publishedPlaceId(slug);
  if (!placeId) return null;
  const where = and(eq(comments.placeId, placeId), eq(comments.status, "published"));
  const [rows, total] = await Promise.all([
    db
      .select({ id: comments.id, body: comments.body, createdAt: comments.createdAt, name: users.name })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(where)
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ n: count() }).from(comments).where(where),
  ]);
  return { items: rows.map(toComment), total: total[0]?.n ?? 0 };
}

export type AddCommentResult =
  | { ok: true; comment: Comment }
  | { ok: false; reason: "not_found" | "rate_limited" };

// Rate limit: at most 5 comments per person per minute (counted in the database,
// so it also works when the app runs on several servers).
export async function addComment(userId: number, slug: string, body: string): Promise<AddCommentResult> {
  const placeId = await publishedPlaceId(slug);
  if (!placeId) return { ok: false, reason: "not_found" };

  const [recent] = await db
    .select({ n: count() })
    .from(comments)
    .where(and(eq(comments.userId, userId), gt(comments.createdAt, sql`now() - interval '1 minute'`)));
  if ((recent?.n ?? 0) >= COMMENT_LIMIT_PER_MINUTE) return { ok: false, reason: "rate_limited" };

  const [created] = await db.insert(comments).values({ placeId, userId, body }).returning();
  const [author] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
  return { ok: true, comment: toComment({ ...created, name: author.name }) };
}

export async function createReport(userId: number, slug: string, input: ReportInput) {
  const placeId = await publishedPlaceId(slug);
  if (!placeId) return null;
  const [created] = await db
    .insert(reports)
    .values({ placeId, userId, reason: input.reason, message: input.message || null })
    .returning({ id: reports.id });
  return created;
}
