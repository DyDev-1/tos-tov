import { badId, parseBody, parseId, toResponse, withAdmin } from "@/lib/admin-route";
import { setCommentStatus } from "@/lib/services/admin";
import { statusChangeSchema } from "@/lib/validation/admin";

// POST /api/v1/admin/comments/:id/status  { status: "published" | "hidden" } — approve, hide or restore. Logged.
export async function POST(request: Request, ctx: RouteContext<"/api/v1/admin/comments/[id]/status">) {
  return withAdmin(async (admin) => {
    const id = parseId((await ctx.params).id);
    if (!id) return badId();
    const body = await parseBody(request, statusChangeSchema);
    if ("response" in body) return body.response;
    return toResponse(await setCommentStatus(admin, id, body.data.status));
  });
}
