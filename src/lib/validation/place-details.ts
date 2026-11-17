import { z } from "zod";

// "What you need", "Getting there" and "Practical" facts on a place page.
// Each fact can have an English and a Khmer text. If one is missing, the other is shown.

export const localizedTextSchema = z.object({
  en: z.string().trim().max(500).optional(),
  km: z.string().trim().max(500).optional(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const DETAIL_KEYS = [
  "ticket",
  "dressCode",
  "whatToBring",
  "difficulty",
  "nearestTown",
  "transport",
  "road",
  "openingHours",
  "timeNeeded",
  "facilities",
  "avoidNote",
] as const;
export type DetailKey = (typeof DETAIL_KEYS)[number];

export const placeDetailsSchema = z.object({
  ticket: localizedTextSchema.optional(),
  dressCode: localizedTextSchema.optional(),
  whatToBring: localizedTextSchema.optional(),
  difficulty: localizedTextSchema.optional(),
  nearestTown: localizedTextSchema.optional(),
  transport: localizedTextSchema.optional(),
  road: localizedTextSchema.optional(),
  openingHours: localizedTextSchema.optional(),
  timeNeeded: localizedTextSchema.optional(),
  facilities: localizedTextSchema.optional(),
  // Warning shown under the month strip, e.g. "March and April: very little water."
  avoidNote: localizedTextSchema.optional(),
});
export type PlaceDetails = z.infer<typeof placeDetailsSchema>;
