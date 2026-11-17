import { z } from "zod";

// Shared Zod schemas. The server validates every API input with these,
// and the frontend imports the same types, so both sides always agree.

export const localeSchema = z.enum(["en", "km"]);
export type Locale = z.infer<typeof localeSchema>;

// Query string values arrive as text, so z.coerce turns "2" into the number 2.
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;
