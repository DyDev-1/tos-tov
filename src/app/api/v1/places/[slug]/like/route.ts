import { jsonData, jsonError, banned, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { setLike } from "@/lib/services/engagement";

type Ctx = RouteContext<"/api/v1/places/[slug]/like">;

async function handle(ctx: Ctx, on: boolean) {
  const { slug } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.bannedAt) return banned();
    const result = await setLike(user.id, slug, on);
    if (!result) return jsonError(404, "not_found", "Place not found");
    return jsonData(result);
  } catch (error) {
    console.error("like failed", error);
    return jsonError(500, "internal_error", "Could not save your like");
  }
}

// PUT /api/v1/places/:slug/like — like. DELETE — remove the like. Both are safe to repeat.
export const PUT = (_request: Request, ctx: Ctx) => handle(ctx, true);
export const DELETE = (_request: Request, ctx: Ctx) => handle(ctx, false);
