import { badId, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { setUserTrusted } from "@/lib/services/admin";

type Ctx = RouteContext<"/api/v1/admin/users/[id]/trust">;

// POST /api/v1/admin/users/:id/trust — make a person trusted: at release stage 4 their places and
// posts are published without waiting. Logged.
export async function POST(_request: Request, ctx: Ctx) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    return toResponse(await setUserTrusted(admin, id, true));
  });
}

// DELETE /api/v1/admin/users/:id/trust — take the trust away. Logged.
export async function DELETE(_request: Request, ctx: Ctx) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    return toResponse(await setUserTrusted(admin, id, false));
  });
}
