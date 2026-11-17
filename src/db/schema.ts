import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  geometry,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { PlaceDetails } from "@/lib/validation/place-details";

// Database tables (Drizzle schema). Each feature slice adds its tables here.

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---------- Reference data ----------

// Cambodia's 25 provinces (Phnom Penh is counted as one). Every Place belongs to one.
export const provinces = pgTable("provinces", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Stable, URL-friendly name, e.g. "siem-reap". Used in links and by the seed script.
  slug: text().notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameKm: text("name_km").notNull(),
  // Lower numbers are shown first (popular provinces first on the Home page).
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}).enableRLS();

// Kinds of places: temples, waterfalls, beaches, mountains, food. Admins manage these.
export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameKm: text("name_km").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}).enableRLS();

// ---------- People ----------

export const userRole = pgEnum("user_role", ["user", "admin"]);

// A copy of the Clerk account, created the first time someone likes, saves, comments or adds a place.
// Clerk owns passwords and sign-in; we only keep what the pages need to show.
export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text().notNull(),
  email: text(),
  role: userRole().notNull().default("user"),
  ...timestamps,
}).enableRLS();

// ---------- Places ----------

// pending = waiting for admin approval, published = visible to everyone, hidden = removed by an admin.
export const placeStatus = pgEnum("place_status", ["pending", "published", "hidden"]);

// A Place exists once ("Bou Sra Waterfall") and holds the facts. Posts (user stories) come later.
export const places = pgTable(
  "places",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    nameEn: text("name_en").notNull(),
    nameKm: text("name_km").notNull(),
    taglineEn: text("tagline_en"),
    taglineKm: text("tagline_km"),
    descriptionEn: text("description_en"),
    descriptionKm: text("description_km"),
    provinceId: integer("province_id")
      .notNull()
      .references(() => provinces.id),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    // Map pin. PostGIS point, longitude = x, latitude = y (SRID 4326 = normal GPS coordinates).
    location: geometry("location", { type: "point", mode: "xy", srid: 4326 }).notNull(),
    // Entry fee in riel for Cambodians and US dollars for foreigners. null = not listed, 0 = free.
    entryFeeKhr: integer("entry_fee_khr"),
    entryFeeUsd: numeric("entry_fee_usd", { precision: 8, scale: 2, mode: "number" }),
    // Months (1 = January ... 12 = December).
    bestMonths: integer("best_months").array().notNull().default(sql`'{}'::integer[]`),
    avoidMonths: integer("avoid_months").array().notNull().default(sql`'{}'::integer[]`),
    // Ticket, dress code, what to bring, how to get there... see PlaceDetails.
    details: jsonb().$type<PlaceDetails>().notNull().default({}),
    status: placeStatus().notNull().default("published"),
    // Counter kept up to date when people like or unlike (avoids counting on every page view).
    likesCount: integer("likes_count").notNull().default(0),
    createdById: integer("created_by_id").references(() => users.id),
    // When admins merge duplicates, the duplicate points to the place it was merged into.
    parentPlaceId: integer("parent_place_id"),
    ...timestamps,
  },
  (t) => [
    foreignKey({ columns: [t.parentPlaceId], foreignColumns: [t.id] }),
    index("places_location_idx").using("gist", t.location),
    index("places_province_idx").on(t.provinceId),
    index("places_category_idx").on(t.categoryId),
    index("places_best_months_idx").using("gin", t.bestMonths),
  ],
).enableRLS();

// Photos of a place. Only the URL is stored (images live in Cloudflare R2).
// postId is added when user posts arrive.
export const photos = pgTable(
  "photos",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    url: text().notNull(),
    alt: text(),
    // Set when the photo belongs to a user's post. null = a photo of the place itself (admin or "Add a place").
    postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdById: integer("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("photos_place_idx").on(t.placeId), index("photos_post_idx").on(t.postId)],
).enableRLS();

// A Post is one person's experience of a place (a Place exists once, many Posts belong to it).
export const postStatus = pgEnum("post_status", ["pending", "published", "hidden"]);

export const posts = pgTable(
  "posts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    story: text().notNull(),
    rating: integer().notNull(),
    // The day the person visited (not the day they wrote the post).
    visitedAt: date("visited_at", { mode: "string" }).notNull(),
    // pending = waiting for an admin, published = visible, hidden = removed by an admin.
    status: postStatus().notNull().default("pending"),
    ...timestamps,
  },
  (t) => [
    index("posts_place_status_idx").on(t.placeId, t.status, t.createdAt),
    index("posts_user_idx").on(t.userId, t.createdAt),
    check("posts_rating_range", sql`${t.rating} between 1 and 5`),
  ],
).enableRLS();

export const contactType = pgEnum("contact_type", ["telegram", "phone"]);

// Local tours and guides on a place page. Contact only: no booking, no payments.
export const guides = pgTable(
  "guides",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    name: text().notNull(),
    tourEn: text("tour_en").notNull(),
    tourKm: text("tour_km").notNull(),
    // Free text such as "$25 per person". Shown as written.
    priceText: text("price_text"),
    contactType: contactType("contact_type").notNull(),
    // A Telegram username (no @) or a phone number.
    contactValue: text("contact_value").notNull(),
    ...timestamps,
  },
  (t) => [index("guides_place_idx").on(t.placeId)],
).enableRLS();

// ---------- Community ----------

export const likes = pgTable(
  "likes",
  {
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // One like per person per place.
  (t) => [primaryKey({ columns: [t.placeId, t.userId] })],
).enableRLS();

export const saves = pgTable(
  "saves",
  {
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.placeId, t.userId] }), index("saves_user_idx").on(t.userId)],
).enableRLS();

export const commentStatus = pgEnum("comment_status", ["published", "hidden"]);

export const comments = pgTable(
  "comments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text().notNull(),
    status: commentStatus().notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_place_idx").on(t.placeId, t.createdAt)],
).enableRLS();

export const reportReason = pgEnum("report_reason", ["wrong_info", "closed", "unsafe", "duplicate", "other"]);
export const reportStatus = pgEnum("report_status", ["open", "resolved"]);

// "Report a problem with this place". Admins review these (a later slice).
export const reports = pgTable(
  "reports",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: reportReason().notNull(),
    message: text(),
    status: reportStatus().notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reports_status_idx").on(t.status, t.createdAt)],
).enableRLS();

export type ProvinceRow = typeof provinces.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type PlaceRow = typeof places.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
export type GuideRow = typeof guides.$inferSelect;
export type CommentRow = typeof comments.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
