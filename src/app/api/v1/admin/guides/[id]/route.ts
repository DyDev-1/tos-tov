import { badId, parseBody, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { deleteGuide, updateGuide } from "@/lib/services/admin";
import { guideInputSchema } from "@/lib/validation/admin";

type Ctx = RouteContext<"/api/v1/admin/guides/[id]">;

// PUT /api/v1/admin/guides/:id — replace a guide's details. Logged.
export async function PUT(request: Request, ctx: Ctx) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    const body = await parseBody(request, guideInputSchema);
    if ("response" in body) return body.response;
    return toResponse(await updateGuide(admin, id, body.data));
  });
}

// DELETE /api/v1/admin/guides/:id — remove a guide. Logged.
export async function DELETE(_request: Request, ctx: Ctx) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    return toResponse(await deleteGuide(admin, id));
  });
}
