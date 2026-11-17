import { badId, parseBody, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { mergePlaces } from "@/lib/services/admin";
import { mergePlaceInputSchema } from "@/lib/validation/admin";

// POST /api/v1/admin/places/:id/merge  { targetId } — merge this duplicate INTO the place targetId. Logged.
export async function POST(request: Request, ctx: RouteContext<"/api/v1/admin/places/[id]/merge">) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    const body = await parseBody(request, mergePlaceInputSchema);
    if ("response" in body) return body.response;
    return toResponse(await mergePlaces(admin, id, body.data.targetId));
  });
}
