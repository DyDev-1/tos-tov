import { badId, parseBody, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { deleteCategory, updateCategory } from "@/lib/services/admin";
import { categoryUpdateSchema } from "@/lib/validation/admin";

type Ctx = RouteContext<"/api/v1/admin/categories/[id]">;

// PATCH /api/v1/admin/categories/:id — change the fields you send. Logged.
export async function PATCH(request: Request, ctx: Ctx) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    const body = await parseBody(request, categoryUpdateSchema);
    if ("response" in body) return body.response;
    return toResponse(await updateCategory(admin, id, body.data));
  });
}

// DELETE /api/v1/admin/categories/:id — only when no place uses it (409 in_use otherwise). Logged.
export async function DELETE(_request: Request, ctx: Ctx) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    return toResponse(await deleteCategory(admin, id));
  });
}
