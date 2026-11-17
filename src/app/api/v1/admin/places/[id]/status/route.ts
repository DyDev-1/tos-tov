import { badId, parseBody, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { setPlaceStatus } from "@/lib/services/admin";
import { statusChangeSchema } from "@/lib/validation/admin";

// POST /api/v1/admin/places/:id/status  { status: "published" | "hidden" } — approve, hide or bring back. Logged.
export async function POST(request: Request, ctx: RouteContext<"/api/v1/admin/places/[id]/status">) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    const body = await parseBody(request, statusChangeSchema);
    if ("response" in body) return body.response;
    return toResponse(await setPlaceStatus(admin, id, body.data.status));
  });
}
