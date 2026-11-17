import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Database tables (Drizzle schema). Each feature slice adds its tables here.

// Cambodia's 25 provinces (Phnom Penh is counted as one). Every Place belongs to one.
export const provinces = pgTable("provinces", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Stable, URL-friendly name, e.g. "siem-reap". Used in links and by the seed script.
  slug: text().notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameKm: text("name_km").notNull(),
  // Lower numbers are shown first (popular provinces first on the Home page).
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Kinds of places: temples, waterfalls, beaches, mountains, food. Admins manage these.
export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameKm: text("name_km").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProvinceRow = typeof provinces.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
