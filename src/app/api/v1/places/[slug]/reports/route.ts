import { jsonData, jsonError, readJson, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createReport } from "@/lib/services/engagement";
import { reportInputSchema } from "@/lib/validation/engagement";

// POST /api/v1/places/:slug/reports  { reason, message? } — report a problem. Needs login.
export async function POST(request: Request, ctx: RouteContext<"/api/v1/places/[slug]/reports">) {
  const { slug } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = reportInputSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(400, "invalid_body", "Please choose a reason", parsed.error.flatten().fieldErrors);

    const report = await createReport(user.id, slug, parsed.data);
    if (!report) return jsonError(404, "not_found", "Place not found");
    return jsonData({ id: report.id }, { status: 201 });
  } catch (error) {
    console.error("report failed", error);
    return jsonError(500, "internal_error", "Could not send your report");
  }
}
