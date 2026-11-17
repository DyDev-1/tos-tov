import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, provinces, type CategoryRow, type ProvinceRow } from "@/db/schema";
import type { Category, Province } from "@/lib/validation/reference";

// Reference data: provinces and categories. Read by the Home page and the public API.

// Map database rows to the public shape. Internal columns (timestamps, sortOrder)
// stay private, so changing the database later does not break API clients.
export function toPublicProvince(row: ProvinceRow): Province {
  return { id: row.id, slug: row.slug, name: { en: row.nameEn, km: row.nameKm } };
}

export function toPublicCategory(row: CategoryRow): Category {
  return { id: row.id, slug: row.slug, name: { en: row.nameEn, km: row.nameKm } };
}

export async function listProvinces(): Promise<Province[]> {
  const rows = await db.select().from(provinces).orderBy(asc(provinces.sortOrder), asc(provinces.nameEn));
  return rows.map(toPublicProvince);
}

export async function listCategories(): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.nameEn));
  return rows.map(toPublicCategory);
}
