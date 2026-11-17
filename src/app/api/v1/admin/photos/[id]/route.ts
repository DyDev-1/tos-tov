import { badId, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { deletePhoto } from "@/lib/services/admin";

// DELETE /api/v1/admin/photos/:id — remove a photo from the site. Logged.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/v1/admin/photos/[id]">) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    return toResponse(await deletePhoto(admin, id));
  });
}
