import { badId, parseBody, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { banUser, unbanUser } from "@/lib/services/admin";
import { banInputSchema } from "@/lib/validation/admin";

type Ctx = RouteContext<"/api/v1/admin/users/[id]/ban">;

// POST /api/v1/admin/users/:id/ban  { reason } — ban a person. Admins and yourself cannot be banned. Logged.
export async function POST(request: Request, ctx: Ctx) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    const body = await parseBody(request, banInputSchema);
    if ("response" in body) return body.response;
    return toResponse(await banUser(admin, id, body.data.reason));
  });
}

// DELETE /api/v1/admin/users/:id/ban — lift the ban. Logged.
export async function DELETE(_request: Request, ctx: Ctx) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    return toResponse(await unbanUser(admin, id));
  });
}
