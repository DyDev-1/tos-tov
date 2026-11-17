import { jsonData, jsonError } from "@/lib/api";
import { badId, parseBody, parseId, PRIVATE, toResponse, withAdmin } from "@/lib/admin-route";
import { getAdminPlace, updatePlace } from "@/lib/services/admin";
import { updatePlaceInputSchema } from "@/lib/validation/admin";

type Ctx = RouteContext<"/api/v1/admin/places/[id]">;

// GET /api/v1/admin/places/:id — one place with everything an editor needs. Admin only.
export async function GET(_request: Request, ctx: Ctx) {
  return withAdmin(async () => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    const place = await getAdminPlace(id);
    return place ? jsonData(place, { cache: PRIVATE }) : jsonError(404, "not_found", "Not found");
  });
}

// PATCH /api/v1/admin/places/:id — change the fields you send. Admin only. Logged.
export async function PATCH(request: Request, ctx: Ctx) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    const body = await parseBody(request, updatePlaceInputSchema);
    if ("response" in body) return body.response;
    return toResponse(await updatePlace(admin, id, body.data));
  });
}
