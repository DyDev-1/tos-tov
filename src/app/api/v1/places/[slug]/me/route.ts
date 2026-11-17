import { jsonData, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getViewerState } from "@/lib/services/engagement";

// GET /api/v1/places/:slug/me — has the logged-in person liked / saved this place?
// Private to the person, so it is never cached.
export async function GET(_request: Request, ctx: RouteContext<"/api/v1/places/[slug]/me">) {
  const { slug } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const state = await getViewerState(user.id, slug);
    if (!state) return jsonError(404, "not_found", "Place not found");
    return jsonData(state, { cache: "private, no-store" });
  } catch (error) {
    console.error("GET place viewer state failed", error);
    return jsonError(500, "internal_error", "Could not load your activity");
  }
}
