import { z } from "zod";
import { placeDetailsSchema } from "./place-details";
import { ratingSummarySchema } from "./posts";
import { localizedNameSchema } from "./reference";

// Public shapes for places, shared by the API and the frontend.

const nullableLocalized = z.object({ en: z.string().nullable(), km: z.string().nullable() });

const refSchema = z.object({ id: z.number().int(), slug: z.string(), name: localizedNameSchema });

// What a card or map pin needs.
export const placeCardSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: localizedNameSchema,
  tagline: nullableLocalized,
  province: refSchema,
  category: refSchema,
  location: z.object({ lat: z.number(), lng: z.number() }),
  likesCount: z.number().int(),
  bestMonths: z.array(z.number().int().min(1).max(12)),
  coverPhoto: z.object({ url: z.string(), alt: z.string().nullable() }).nullable(),
  addedBy: z.string().nullable(),
  createdAt: z.string(),
});
export type PlaceCard = z.infer<typeof placeCardSchema>;

export const guideSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  tour: localizedNameSchema,
  priceText: z.string().nullable(),
  contactType: z.enum(["telegram", "phone"]),
  contactValue: z.string(),
});
export type Guide = z.infer<typeof guideSchema>;

// Everything on the place page.
export const placeDetailSchema = placeCardSchema.extend({
  description: nullableLocalized,
  avoidMonths: z.array(z.number().int().min(1).max(12)),
  entryFee: z.object({ khr: z.number().nullable(), usd: z.number().nullable() }),
  details: placeDetailsSchema,
  photos: z.array(z.object({ id: z.number().int(), url: z.string(), alt: z.string().nullable() })),
  guides: z.array(guideSchema),
  commentsCount: z.number().int(),
  rating: ratingSummarySchema,
  updatedAt: z.string(),
});
export type PlaceDetail = z.infer<typeof placeDetailSchema>;

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80);

// Query string of GET /api/v1/places. Query values arrive as text, so numbers are coerced.
export const listPlacesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  province: slug.optional(),
  category: slug.optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  sort: z.enum(["likes", "recent", "name"]).default("likes"),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListPlacesQuery = z.infer<typeof listPlacesQuerySchema>;
