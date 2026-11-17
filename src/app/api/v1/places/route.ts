import { jsonData, jsonError, PLACES_CACHE } from "@/lib/api";
import { listPlaces } from "@/lib/services/places";
import { listPlacesQuerySchema } from "@/lib/validation/places";

// GET /api/v1/places?q=&province=&category=&month=&sort=&limit=&offset=
// Response: { data: PlaceCard[], meta: { total, limit, offset } }
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = listPlacesQuerySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError(400, "invalid_query", "Some filters are not valid", parsed.error.flatten().fieldErrors);
  }

  try {
    const { items, total } = await listPlaces(parsed.data);
    return jsonData(items, {
      cache: PLACES_CACHE,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    console.error("GET /api/v1/places failed", error);
    return jsonError(500, "internal_error", "Could not load places");
  }
}
