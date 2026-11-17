import { jsonData, jsonError, PLACES_CACHE, readJson, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createPlace } from "@/lib/services/place-submissions";
import { listPlaces } from "@/lib/services/places";
import { createPlaceInputSchema } from "@/lib/validation/place-input";
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

// POST /api/v1/places — add a place. Needs login. New places are "pending" until an admin approves them.
// 201 { data: { id, slug, status } } | 409 possible_duplicate | 429 rate_limited | 400 invalid_body
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = createPlaceInputSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(400, "invalid_body", "Some details are missing or not valid", parsed.error.flatten().fieldErrors);
    }

    const result = await createPlace(user, parsed.data);
    if (result.ok) return jsonData(result.place, { status: 201 });

    switch (result.reason) {
      case "rate_limited":
        return jsonError(429, "rate_limited", "You added several places in a short time. Please try again later.");
      case "possible_duplicate":
        return jsonError(409, "possible_duplicate", "A place like this may already exist", result.duplicate);
      case "invalid_photos":
        return jsonError(400, "invalid_photos", "Photos must be uploaded through the site");
      default:
        return jsonError(400, "invalid_reference", "Unknown province or category");
    }
  } catch (error) {
    console.error("POST /api/v1/places failed", error);
    return jsonError(500, "internal_error", "Could not add the place");
  }
}
