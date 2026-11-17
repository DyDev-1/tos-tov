import { jsonData, jsonError, readJson, banned, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createPost, listPosts } from "@/lib/services/posts";
import { createPostInputSchema, listPostsQuerySchema } from "@/lib/validation/posts";

type Ctx = RouteContext<"/api/v1/places/[slug]/posts">;

// GET /api/v1/places/:slug/posts?limit=&offset= — published posts, newest first. Public.
export async function GET(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const parsed = listPostsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError(400, "invalid_query", "Some options are not valid");

  try {
    const result = await listPosts(slug, parsed.data);
    if (!result) return jsonError(404, "not_found", "Place not found");
    return jsonData(result.items, {
      cache: "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      meta: { total: result.total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    console.error("list posts failed", error);
    return jsonError(500, "internal_error", "Could not load posts");
  }
}

// POST /api/v1/places/:slug/posts  { story, rating, visitedAt, photos? } — share an experience. Needs login.
// 201 { data: { id, status } } (status "pending" until an admin approves) | 429 rate_limited | 400 invalid_body
export async function POST(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.bannedAt) return banned();

    const parsed = createPostInputSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(400, "invalid_body", "Some details are missing or not valid", parsed.error.flatten().fieldErrors);
    }

    const result = await createPost(user, slug, parsed.data);
    if (result.ok) return jsonData(result.post, { status: 201 });
    switch (result.reason) {
      case "not_found":
        return jsonError(404, "not_found", "Place not found");
      case "rate_limited":
        return jsonError(429, "rate_limited", "You shared several posts in a short time. Please try again later.");
      default:
        return jsonError(400, "invalid_photos", "Photos must be uploaded through the site");
    }
  } catch (error) {
    console.error("add post failed", error);
    return jsonError(500, "internal_error", "Could not share your post");
  }
}
