import { jsonData, jsonError, PLACES_CACHE } from "@/lib/api";
import { listNearbyPlaces } from "@/lib/services/places";
import { nearbyQuerySchema } from "@/lib/validation/place-input";

// GET /api/v1/places/nearby?lat=&lng=&radius=500&limit=3
// Response: { data: [{ place: PlaceCard, distanceMeters }] }, nearest first.
export async function GET(request: Request) {
  const parsed = nearbyQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return jsonError(400, "invalid_query", "Please give a valid lat and lng", parsed.error.flatten().fieldErrors);
  }
  try {
    const { lat, lng, radius, limit } = parsed.data;
    return jsonData(await listNearbyPlaces({ lat, lng, radiusMeters: radius, limit }), { cache: PLACES_CACHE });
  } catch (error) {
    console.error("GET /api/v1/places/nearby failed", error);
    return jsonError(500, "internal_error", "Could not look for nearby places");
  }
}
