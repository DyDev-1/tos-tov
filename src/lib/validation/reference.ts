import { z } from "zod";

// Public shapes for provinces and categories, shared by the API and the frontend.
// Both languages come back together, so a client can switch language without a new request.

export const localizedNameSchema = z.object({
  en: z.string().min(1),
  km: z.string().min(1),
});
export type LocalizedName = z.infer<typeof localizedNameSchema>;

export const provinceSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: localizedNameSchema,
});
export type Province = z.infer<typeof provinceSchema>;

export const categorySchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: localizedNameSchema,
});
export type Category = z.infer<typeof categorySchema>;
