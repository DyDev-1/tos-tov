import { z } from "zod";
import { placeDetailsSchema } from "./place-details";
import { CAMBODIA_BOUNDS } from "./place-input";

// Admin input and output shapes. Admin shapes may show more than public ones (emails, statuses).

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80);
const months = z.array(z.number().int().min(1).max(12)).max(12).transform((m) => [...new Set(m)].sort((a, b) => a - b));
const nullableText = (max: number) => z.string().trim().max(max).nullable();

export const adminListQuerySchema = z.object({
  status: z.string().optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;

export const placeStatusSchema = z.enum(["pending", "published", "hidden"]);

// Edit a place. Send only what changes; at least one field.
export const updatePlaceInputSchema = z
  .object({
    nameEn: z.string().trim().min(1).max(120),
    nameKm: z.string().trim().min(1).max(120),
    taglineEn: nullableText(160),
    taglineKm: nullableText(160),
    descriptionEn: nullableText(2000),
    descriptionKm: nullableText(2000),
    provinceSlug: slug,
    categorySlug: slug,
    lat: z.number().min(CAMBODIA_BOUNDS.minLat).max(CAMBODIA_BOUNDS.maxLat),
    lng: z.number().min(CAMBODIA_BOUNDS.minLng).max(CAMBODIA_BOUNDS.maxLng),
    entryFeeKhr: z.number().int().min(0).max(10_000_000).nullable(),
    entryFeeUsd: z.number().min(0).max(10_000).multipleOf(0.01).nullable(),
    bestMonths: months,
    avoidMonths: months,
    details: placeDetailsSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Send at least one field to change")
  .refine((value) => (value.lat === undefined) === (value.lng === undefined), "Send lat and lng together");
export type UpdatePlaceInput = z.infer<typeof updatePlaceInputSchema>;

export const mergePlaceInputSchema = z.object({ targetId: z.number().int().positive() });

export const guideInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  tourEn: z.string().trim().min(1).max(160),
  tourKm: z.string().trim().min(1).max(160),
  priceText: nullableText(60).default(null),
  contactType: z.enum(["telegram", "phone"]),
  contactValue: z.string().trim().min(1).max(40),
}).superRefine((value, ctx) => {
  // A Telegram username has no @ and no spaces; a phone number is digits, with an optional + and spaces.
  const ok = value.contactType === "telegram" ? /^[A-Za-z0-9_]{5,32}$/.test(value.contactValue) : /^\+?[0-9 ]{6,20}$/.test(value.contactValue);
  if (!ok) ctx.addIssue({ code: "custom", path: ["contactValue"], message: value.contactType === "telegram" ? "Use the Telegram username without @" : "Use a phone number like +855 12 345 678" });
});
export type GuideInput = z.infer<typeof guideInputSchema>;

export const categoryInputSchema = z.object({
  slug,
  nameEn: z.string().trim().min(1).max(60),
  nameKm: z.string().trim().min(1).max(60),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export const categoryUpdateSchema = categoryInputSchema.partial().refine((v) => Object.keys(v).length > 0, "Send at least one field to change");

export const statusChangeSchema = z.object({ status: z.enum(["published", "hidden"]) });
export const reportResolveSchema = z.object({ status: z.literal("resolved") });
export const banInputSchema = z.object({ reason: z.string().trim().min(3).max(300) });
