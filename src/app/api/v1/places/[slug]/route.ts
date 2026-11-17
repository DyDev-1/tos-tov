import { jsonData, jsonError, PLACES_CACHE } from "@/lib/api";
import { getPlaceBySlug } from "@/lib/services/places";

// GET /api/v1/places/:slug — one place with all its details. Response: { data: PlaceDetail }
export async function GET(_request: Request, ctx: RouteContext<"/api/v1/places/[slug]">) {
  const { slug } = await ctx.params;
  try {
    const place = await getPlaceBySlug(slug);
    if (!place) return jsonError(404, "not_found", "Place not found");
    return jsonData(place, { cache: PLACES_CACHE });
  } catch (error) {
    console.error(`GET /api/v1/places/${slug} failed`, error);
    return jsonError(500, "internal_error", "Could not load the place");
  }
}
