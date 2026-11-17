import { z } from "zod";
import { isValidVisitDate } from "@/lib/dates";
import { MAX_PHOTOS_PER_PLACE } from "@/lib/uploads-shared";

// A Post is one person's experience of a place: story, rating, the day they visited, and photos.

export const createPostInputSchema = z.object({
  story: z.string().trim().min(10).max(3000),
  rating: z.number().int().min(1).max(5),
  visitedAt: z.string().refine((value) => isValidVisitDate(value), "Please choose a day that has already happened"),
  // Optional: uploaded to our storage first (see /api/v1/uploads/image).
  photos: z.array(z.string().url().max(500)).max(MAX_PHOTOS_PER_PLACE).default([]),
});
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export const postSchema = z.object({
  id: z.number().int(),
  story: z.string(),
  rating: z.number().int().min(1).max(5),
  visitedAt: z.string(),
  createdAt: z.string(),
  author: z.object({ name: z.string() }),
  photos: z.array(z.object({ url: z.string() })),
});
export type Post = z.infer<typeof postSchema>;

export const listPostsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ratingSummarySchema = z.object({
  average: z.number().min(1).max(5).nullable(),
  count: z.number().int().min(0),
});
export type RatingSummary = z.infer<typeof ratingSummarySchema>;
