import { z } from "zod";

// Input and output shapes for comments, reports and the viewer's own state.

export const commentInputSchema = z.object({
  body: z.string().trim().min(1, "Write something first").max(1000, "Please keep it under 1000 characters"),
});
export type CommentInput = z.infer<typeof commentInputSchema>;

export const commentSchema = z.object({
  id: z.number().int(),
  body: z.string(),
  createdAt: z.string(),
  author: z.object({ name: z.string() }),
});
export type Comment = z.infer<typeof commentSchema>;

export const listCommentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const REPORT_REASONS = ["wrong_info", "closed", "unsafe", "duplicate", "other"] as const;

export const reportInputSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  message: z.string().trim().max(1000).optional(),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export const viewerStateSchema = z.object({ liked: z.boolean(), saved: z.boolean() });
export type ViewerState = z.infer<typeof viewerStateSchema>;
