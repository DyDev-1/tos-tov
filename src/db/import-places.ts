import { and, eq, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { slugify } from "../lib/i18n-content";
import { CAMBODIA_BOUNDS } from "../lib/validation/place-input";
import { DETAIL_KEYS, type DetailKey, type PlaceDetails } from "../lib/validation/place-details";
import * as schema from "./schema";

// Bulk import of places from a spreadsheet (CSV) or JSON file. Used by `npm run db:import`.
// Rules: every row is checked first and ALL problems are reported with the row number; nothing is written
// unless every row is valid (all or nothing); by default existing places are never changed.
// No place facts are invented here: the file is the only source.

type Db = PostgresJsDatabase<typeof schema>;
export type RawRecord = { line: number; values: Record<string, string> };
export type Issue = { line: number; column?: string; message: string };

export type ImportRow = {
  line: number;
  slug: string;
  nameEn: string;
  nameKm: string;
  taglineEn: string | null;
  taglineKm: string | null;
  descriptionEn: string | null;
  descriptionKm: string | null;
  province: string;
  category: string;
  lat: number;
  lng: number;
  entryFeeKhr: number | null;
  entryFeeUsd: number | null;
  bestMonths: number[];
  avoidMonths: number[];
  photos: string[];
  details: PlaceDetails;
};

// ------------------------------------------------------------------ Reading files

// CSV as spreadsheets write it: commas, "quoted, text", "" for a quote inside quotes, newlines inside
// quotes, an optional byte-order mark at the start, and semicolons are NOT separators.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

export function readRecords(text: string, format: "csv" | "json"): { records: RawRecord[]; issues: Issue[] } {
  const issues: Issue[] = [];
  if (format === "json") {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { records: [], issues: [{ line: 0, message: "The file is not valid JSON." }] };
    }
    if (!Array.isArray(data)) return { records: [], issues: [{ line: 0, message: "The JSON file must contain a list of places." }] };
    const records = data.map((item, index) => ({
      line: index + 1,
      values: Object.fromEntries(
        Object.entries((item ?? {}) as Record<string, unknown>).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : v === null || v === undefined ? "" : String(v)]),
      ),
    }));
    return { records, issues };
  }

  const table = parseCsv(text);
  if (table.length === 0) return { records: [], issues: [{ line: 0, message: "The file is empty." }] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const records = table.slice(1).map((cells, index) => ({
    line: index + 2, // line 1 is the header, as in the spreadsheet
    values: Object.fromEntries(header.map((name, col) => [name, cells[col] ?? ""])),
  }));
  return { records, issues };
}

// ------------------------------------------------------------------ Checking rows

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthNumber(token: string): number | null {
  const t = token.trim().toLowerCase();
  if (/^\d{1,2}$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= 12 ? n : null;
  }
  const index = MONTH_NAMES.findIndex((name) => t.startsWith(name));
  return index >= 0 && t.length >= 3 ? index + 1 : null;
}

// "7 8 9", "7,8,9", "7-12", "Jul-Dec", "Nov-Feb" (wraps over the new year). Returns null when something is wrong.
export function parseMonths(text: string): number[] | null {
  const months = new Set<number>();
  for (const token of text.split(/[,\s;]+/).filter(Boolean)) {
    const range = token.split("-");
    if (range.length === 2) {
      const from = monthNumber(range[0]);
      const to = monthNumber(range[1]);
      if (from === null || to === null) return null;
      for (let m = from; ; m = (m % 12) + 1) {
        months.add(m);
        if (m === to) break;
      }
    } else {
      const m = monthNumber(token);
      if (m === null) return null;
      months.add(m);
    }
  }
  return [...months].sort((a, b) => a - b);
}

const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const DETAIL_COLUMNS = DETAIL_KEYS.flatMap((key) => [`${snake(key)}_en`, `${snake(key)}_km`]);
export const IMPORT_COLUMNS = [
  "slug", "name_en", "name_km", "tagline_en", "tagline_km", "description_en", "description_km",
  "province", "category", "lat", "lng", "entry_fee_khr", "entry_fee_usd", "best_months", "avoid_months", "photo_urls",
  ...DETAIL_COLUMNS,
];

const MAX = { name: 120, tagline: 160, description: 2000, detail: 500 };

export function normalizeRecords(
  records: RawRecord[],
  options: { photoBase?: string | null } = {},
): { rows: ImportRow[]; issues: Issue[]; warnings: Issue[] } {
  const rows: ImportRow[] = [];
  const issues: Issue[] = [];
  const warnings: Issue[] = [];

  // A column that is not one we know is almost always a typo, and its data would be lost silently.
  const columns = new Set(records.flatMap((r) => Object.keys(r.values)));
  for (const column of columns) {
    if (!IMPORT_COLUMNS.includes(column)) issues.push({ line: 1, column, message: `Unknown column "${column}". Known columns are listed in data/README.md.` });
  }

  const seen = new Map<string, number>();
  for (const { line, values } of records) {
    const text = (column: string) => (values[column] ?? "").trim();
    const mine: Issue[] = [];
    const bad = (column: string, message: string) => mine.push({ line, column, message });

    const nameEn = text("name_en");
    const nameKm = text("name_km");
    if (!nameEn) bad("name_en", "The English name is required.");
    if (nameEn.length > MAX.name) bad("name_en", `The English name is longer than ${MAX.name} characters.`);
    if (nameKm.length > MAX.name) bad("name_km", `The Khmer name is longer than ${MAX.name} characters.`);
    if (nameEn && !nameKm) warnings.push({ line, column: "name_km", message: "No Khmer name. The English name will be shown to Khmer visitors." });

    const slug = text("slug") || slugify(nameEn);
    if (!slug) bad("slug", "Could not make a web name from the name. Add a slug column value like bou-sra-waterfall.");
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) bad("slug", `"${slug}" is not a valid web name (lowercase letters, numbers and dashes).`);
    else if (seen.has(slug)) bad("slug", `The web name "${slug}" is already used on line ${seen.get(slug)}.`);
    else seen.set(slug, line);

    const province = text("province");
    const category = text("category");
    if (!province) bad("province", "The province is required.");
    if (!category) bad("category", "The category is required.");

    const lat = Number(text("lat"));
    const lng = Number(text("lng"));
    if (text("lat") === "" || !Number.isFinite(lat)) bad("lat", "The latitude must be a number like 12.5135.");
    else if (lat < CAMBODIA_BOUNDS.minLat || lat > CAMBODIA_BOUNDS.maxLat) bad("lat", `The latitude ${lat} is outside Cambodia (${CAMBODIA_BOUNDS.minLat} to ${CAMBODIA_BOUNDS.maxLat}). Are lat and lng swapped?`);
    if (text("lng") === "" || !Number.isFinite(lng)) bad("lng", "The longitude must be a number like 107.4287.");
    else if (lng < CAMBODIA_BOUNDS.minLng || lng > CAMBODIA_BOUNDS.maxLng) bad("lng", `The longitude ${lng} is outside Cambodia (${CAMBODIA_BOUNDS.minLng} to ${CAMBODIA_BOUNDS.maxLng}). Are lat and lng swapped?`);

    const fee = (column: string, kind: "khr" | "usd"): number | null => {
      const raw = text(column);
      if (raw === "") return null; // empty = not listed (never guessed)
      const n = Number(raw.replace(/[$,៛\s]/g, ""));
      const okValue = Number.isFinite(n) && n >= 0 && (kind === "khr" ? Number.isInteger(n) && n <= 10_000_000 : n <= 10_000 && Math.round(n * 100) === n * 100);
      if (!okValue) {
        bad(column, kind === "khr" ? "The fee in riel must be a whole number, 0 or more (or empty if not known)." : "The fee in US dollars must be a number like 5 or 2.5, 0 or more (or empty if not known).");
        return null;
      }
      return n;
    };
    const entryFeeKhr = fee("entry_fee_khr", "khr");
    const entryFeeUsd = fee("entry_fee_usd", "usd");

    const monthsOf = (column: string) => {
      const raw = text(column);
      if (raw === "") return [];
      const parsed = parseMonths(raw);
      if (!parsed) bad(column, `"${raw}" is not a list of months. Use numbers (7 8 9), a range (7-12) or names (Jul-Dec).`);
      return parsed ?? [];
    };
    const bestMonths = monthsOf("best_months");
    const avoidMonths = monthsOf("avoid_months");
    const both = bestMonths.filter((m) => avoidMonths.includes(m));
    if (both.length > 0) bad("avoid_months", `Month ${both.join(", ")} is in both best_months and avoid_months.`);
    if (bestMonths.length === 0) warnings.push({ line, column: "best_months", message: "No best months. The place will not appear when visitors filter by season." });

    const optional = (column: string, max: number, label: string) => {
      const value = text(column);
      if (value.length > max) bad(column, `${label} is longer than ${max} characters (it has ${value.length}).`);
      return value || null;
    };
    const taglineEn = optional("tagline_en", MAX.tagline, "The English tagline");
    const taglineKm = optional("tagline_km", MAX.tagline, "The Khmer tagline");
    const descriptionEn = optional("description_en", MAX.description, "The English description");
    const descriptionKm = optional("description_km", MAX.description, "The Khmer description");

    const details: PlaceDetails = {};
    for (const key of DETAIL_KEYS as readonly DetailKey[]) {
      const en = optional(`${snake(key)}_en`, MAX.detail, `The English ${key}`);
      const km = optional(`${snake(key)}_km`, MAX.detail, `The Khmer ${key}`);
      if (en || km) details[key] = { ...(en ? { en } : {}), ...(km ? { km } : {}) };
    }

    const photos = text("photo_urls").split(/\s+/).filter(Boolean);
    if (photos.length > 10) bad("photo_urls", "At most 10 photos per place.");
    for (const url of photos) {
      if (!options.photoBase) {
        bad("photo_urls", "Photo storage is not set up (R2_PUBLIC_URL is empty), so photo addresses cannot be checked.");
        break;
      }
      if (!url.startsWith(`${options.photoBase}/`)) {
        bad("photo_urls", `"${url}" does not start with ${options.photoBase}/. Photos must be uploaded to our own storage first.`);
        break;
      }
    }

    issues.push(...mine);
    if (mine.length === 0) {
      rows.push({
        line, slug, nameEn, nameKm: nameKm || nameEn, taglineEn, taglineKm, descriptionEn, descriptionKm,
        province, category, lat, lng, entryFeeKhr, entryFeeUsd, bestMonths, avoidMonths, photos, details,
      });
    }
  }
  return { rows, issues, warnings };
}

// ------------------------------------------------------------------ Writing

export type ImportOptions = {
  /** Change places that already exist (matched by web name). Default: leave them alone. */
  update?: boolean;
  /** Add new places as "pending" for an admin to approve, instead of published. */
  pending?: boolean;
  /** Check everything, write nothing. */
  dryRun?: boolean;
  /** Who is importing: sets "added by" and writes one line in the admin log. */
  adminId?: number;
};

export type ImportReport = {
  created: string[];
  updated: string[];
  skipped: string[];
  issues: Issue[];
  warnings: Issue[];
  written: boolean;
};

const NEAR_METERS = 150;

export async function importPlaces(db: Db, rows: ImportRow[], options: ImportOptions = {}): Promise<ImportReport> {
  const report: ImportReport = { created: [], updated: [], skipped: [], issues: [], warnings: [], written: false };

  // Provinces and categories may be given as the web name ("siem-reap") or the English name ("Siem Reap").
  const provinceRows = await db.select().from(schema.provinces);
  const categoryRows = await db.select().from(schema.categories);
  const find = <T extends { id: number; slug: string; nameEn: string }>(list: T[], value: string) =>
    list.find((x) => x.slug === value.toLowerCase() || x.slug === slugify(value) || x.nameEn.toLowerCase() === value.toLowerCase());

  const resolved: (ImportRow & { provinceId: number; categoryId: number })[] = [];
  for (const row of rows) {
    const province = find(provinceRows, row.province);
    const category = find(categoryRows, row.category);
    if (!province) report.issues.push({ line: row.line, column: "province", message: `Unknown province "${row.province}". Use a name from the list of 25 provinces.` });
    if (!category) report.issues.push({ line: row.line, column: "category", message: `Unknown category "${row.category}". Known: ${categoryRows.map((c) => c.slug).join(", ")}.` });
    if (province && category) resolved.push({ ...row, provinceId: province.id, categoryId: category.id });
  }
  if (report.issues.length > 0) return report;

  const existing = new Map(
    (await db.select({ id: schema.places.id, slug: schema.places.slug }).from(schema.places).where(inArray(schema.places.slug, resolved.map((r) => r.slug)))).map((r) => [r.slug, r.id]),
  );

  // Warn about a likely duplicate: a different place of ours within 150 metres.
  for (const row of resolved) {
    if (existing.has(row.slug)) continue;
    const near = await db
      .select({ slug: schema.places.slug })
      .from(schema.places)
      .where(sql`ST_DWithin(${schema.places.location}::geography, ST_SetSRID(ST_MakePoint(${row.lng}, ${row.lat}), 4326)::geography, ${NEAR_METERS})`)
      .limit(1);
    if (near[0]) report.warnings.push({ line: row.line, column: "lat", message: `Within ${NEAR_METERS} m of the existing place "${near[0].slug}". Is it the same place?` });
  }
  // ...and within the file itself.
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const a = resolved[i];
      const b = resolved[j];
      const metres = Math.hypot((a.lat - b.lat) * 111_000, (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180));
      if (metres < NEAR_METERS) report.warnings.push({ line: b.line, column: "lat", message: `Within ${NEAR_METERS} m of line ${a.line} ("${a.slug}"). Is it the same place?` });
    }
  }

  const toCreate = resolved.filter((r) => !existing.has(r.slug));
  const toUpdate = resolved.filter((r) => existing.has(r.slug) && options.update);
  report.created = toCreate.map((r) => r.slug);
  report.updated = toUpdate.map((r) => r.slug);
  report.skipped = resolved.filter((r) => existing.has(r.slug) && !options.update).map((r) => r.slug);
  if (options.dryRun) return report;

  const values = (row: (typeof resolved)[number]) => ({
    nameEn: row.nameEn,
    nameKm: row.nameKm,
    taglineEn: row.taglineEn,
    taglineKm: row.taglineKm,
    descriptionEn: row.descriptionEn,
    descriptionKm: row.descriptionKm,
    provinceId: row.provinceId,
    categoryId: row.categoryId,
    location: sql`ST_SetSRID(ST_MakePoint(${row.lng}, ${row.lat}), 4326)` as unknown as { x: number; y: number },
    entryFeeKhr: row.entryFeeKhr,
    entryFeeUsd: row.entryFeeUsd,
    bestMonths: row.bestMonths,
    avoidMonths: row.avoidMonths,
    details: row.details,
  });

  // One transaction: if anything fails, nothing is written.
  await db.transaction(async (tx) => {
    for (const row of toCreate) {
      const [place] = await tx
        .insert(schema.places)
        .values({ slug: row.slug, ...values(row), status: options.pending ? "pending" : "published", createdById: options.adminId ?? null })
        .returning({ id: schema.places.id });
      if (row.photos.length > 0) {
        await tx.insert(schema.photos).values(row.photos.map((url, index) => ({ placeId: place.id, url, sortOrder: index, createdById: options.adminId ?? null })));
      }
    }
    for (const row of toUpdate) {
      const id = existing.get(row.slug)!;
      await tx.update(schema.places).set({ ...values(row), updatedAt: sql`now()` }).where(eq(schema.places.id, id));
      if (row.photos.length > 0) {
        // The file's photos replace the place's own photos (photos from users' posts stay).
        await tx.delete(schema.photos).where(and(eq(schema.photos.placeId, id), sql`${schema.photos.postId} is null`));
        await tx.insert(schema.photos).values(row.photos.map((url, index) => ({ placeId: id, url, sortOrder: index, createdById: options.adminId ?? null })));
      }
    }
    if (options.adminId !== undefined && (toCreate.length > 0 || toUpdate.length > 0)) {
      await tx.insert(schema.adminActions).values({
        adminId: options.adminId,
        action: "place.import",
        targetType: "place",
        targetId: null,
        details: { created: toCreate.length, updated: toUpdate.length, skipped: report.skipped.length },
      });
    }
  });
  report.written = true;
  return report;
}

// The whole import in one call: read, check, and (only if everything is fine) write.
// This is what `npm run db:import` runs, and what the tests run.
export type RunResult = ImportReport & { rowCount: number; problems: Issue[]; notes: Issue[] };

export async function runImport(
  db: Db,
  text: string,
  format: "csv" | "json",
  options: ImportOptions & { photoBase?: string | null } = {},
): Promise<RunResult> {
  const { records, issues: readIssues } = readRecords(text, format);
  const { rows, issues, warnings } = normalizeRecords(records, { photoBase: options.photoBase });
  const fileProblems = [...readIssues, ...issues];

  // With a problem in the file we still look at the database (to report province / category mistakes
  // and likely duplicates), but we write nothing.
  const report = await importPlaces(db, rows, { ...options, dryRun: options.dryRun || fileProblems.length > 0 });
  const problems = [...fileProblems, ...report.issues];
  const notes = [...warnings, ...report.warnings];

  return { ...report, rowCount: records.length, problems, notes };
}
