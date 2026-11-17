import { jsonData, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { listPlaces } from "@/lib/services/places";
import { listPlacesQuerySchema } from "@/lib/validation/places";

// GET /api/v1/me/saves?limit=&offset= — the places the logged-in person saved. Private, never cached.
export async function GET(request: Request) {
  const parsed = listPlacesQuerySchema.pick({ limit: true, offset: true }).safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return jsonError(400, "invalid_query", "Some options are not valid");

  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { items, total } = await listPlaces(
      listPlacesQuerySchema.parse({ ...parsed.data, sort: "recent" }),
      { savedByUserId: user.id },
    );
    return jsonData(items, {
      cache: "private, no-store",
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    console.error("GET /api/v1/me/saves failed", error);
    return jsonError(500, "internal_error", "Could not load your saved places");
  }
}
