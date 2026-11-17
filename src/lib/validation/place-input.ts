import { z } from "zod";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_PHOTOS_PER_PLACE } from "@/lib/uploads-shared";

// What a person sends when adding a place. The server checks all of it with these rules,
// and the form uses the same limits, so both sides agree.

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80);

// Cambodia fits inside this box. It stops pins in the sea or on another continent.
export const CAMBODIA_BOUNDS = { minLat: 9.9, maxLat: 14.8, minLng: 102.2, maxLng: 107.8 } as const;

export const createPlaceInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  provinceSlug: slug,
  categorySlug: slug,
  lat: z.number().min(CAMBODIA_BOUNDS.minLat).max(CAMBODIA_BOUNDS.maxLat),
  lng: z.number().min(CAMBODIA_BOUNDS.minLng).max(CAMBODIA_BOUNDS.maxLng),
  photos: z.array(z.string().url().max(500)).min(1).max(MAX_PHOTOS_PER_PLACE),
  description: z.string().trim().max(2000).optional(),
  bestMonths: z
    .array(z.number().int().min(1).max(12))
    .max(12)
    .default([])
    .transform((months) => [...new Set(months)].sort((a, b) => a - b)),
  entryFeeKhr: z.number().int().min(0).max(10_000_000).optional(),
  entryFeeUsd: z.number().min(0).max(10_000).multipleOf(0.01).optional(),
  whatToBring: z.string().trim().max(500).optional(),
  // Set when the person saw "a similar place exists" and still wants to add theirs.
  allowDuplicate: z.boolean().default(false),
});
export type CreatePlaceInput = z.infer<typeof createPlaceInputSchema>;

export const uploadRequestSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().min(1).max(MAX_IMAGE_BYTES),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(10).max(5000).default(500),
  limit: z.coerce.number().int().min(1).max(10).default(3),
});
