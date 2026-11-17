import { badId, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { resolveReport } from "@/lib/services/admin";

// POST /api/v1/admin/reports/:id/resolve — mark a report as handled. Logged.
export async function POST(_request: Request, ctx: RouteContext<"/api/v1/admin/reports/[id]/resolve">) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    return toResponse(await resolveReport(admin, id));
  });
}
