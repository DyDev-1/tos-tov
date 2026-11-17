import { jsonData, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { setSave } from "@/lib/services/engagement";

type Ctx = RouteContext<"/api/v1/places/[slug]/save">;

async function handle(ctx: Ctx, on: boolean) {
  const { slug } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const result = await setSave(user.id, slug, on);
    if (!result) return jsonError(404, "not_found", "Place not found");
    return jsonData(result);
  } catch (error) {
    console.error("save failed", error);
    return jsonError(500, "internal_error", "Could not save this place");
  }
}

// PUT /api/v1/places/:slug/save — save for later. DELETE — remove from saved.
export const PUT = (_request: Request, ctx: Ctx) => handle(ctx, true);
export const DELETE = (_request: Request, ctx: Ctx) => handle(ctx, false);
