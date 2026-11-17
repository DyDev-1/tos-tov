import { badId, parseBody, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { createGuide } from "@/lib/services/admin";
import { guideInputSchema } from "@/lib/validation/admin";

// POST /api/v1/admin/places/:id/guides — add a local tour or guide (contact only). Logged.
export async function POST(request: Request, ctx: RouteContext<"/api/v1/admin/places/[id]/guides">) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    const body = await parseBody(request, guideInputSchema);
    if ("response" in body) return body.response;
    return toResponse(await createGuide(admin, id, body.data), 201);
  });
}
