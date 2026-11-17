import { jsonData, jsonError, readJson, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { addComment, listComments } from "@/lib/services/engagement";
import { commentInputSchema, listCommentsQuerySchema } from "@/lib/validation/engagement";

type Ctx = RouteContext<"/api/v1/places/[slug]/comments">;

// GET /api/v1/places/:slug/comments?limit=&offset= — newest first. Public.
export async function GET(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const parsed = listCommentsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError(400, "invalid_query", "Some options are not valid");

  try {
    const result = await listComments(slug, parsed.data);
    if (!result) return jsonError(404, "not_found", "Place not found");
    return jsonData(result.items, {
      meta: { total: result.total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    console.error("list comments failed", error);
    return jsonError(500, "internal_error", "Could not load comments");
  }
}

// POST /api/v1/places/:slug/comments  { body } — add a comment. Needs login. 5 per minute per person.
export async function POST(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = commentInputSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(400, "invalid_body", parsed.error.issues[0]?.message ?? "Invalid comment", parsed.error.flatten().fieldErrors);
    }

    const result = await addComment(user.id, slug, parsed.data.body);
    if (!result.ok) {
      return result.reason === "not_found"
        ? jsonError(404, "not_found", "Place not found")
        : jsonError(429, "rate_limited", "You are commenting too fast. Please wait a minute.");
    }
    return jsonData(result.comment, { status: 201 });
  } catch (error) {
    console.error("add comment failed", error);
    return jsonError(500, "internal_error", "Could not post your comment");
  }
}
