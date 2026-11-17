import { jsonData } from "@/lib/api";
import { parseBody, PRIVATE, toResponse, withAdmin } from "@/lib/admin-route";
import { createCategory, listAdminCategories } from "@/lib/services/admin";
import { categoryInputSchema } from "@/lib/validation/admin";

// GET /api/v1/admin/categories — all categories with how many places use each. Admin only.
export async function GET() {
  return withAdmin(async () => jsonData(await listAdminCategories(), { cache: PRIVATE }));
}

// POST /api/v1/admin/categories  { slug, nameEn, nameKm, sortOrder? } — add a category. Logged.
export async function POST(request: Request) {
  return withAdmin(async (admin) => {
    const body = await parseBody(request, categoryInputSchema);
    if ("response" in body) return body.response;
    return toResponse(await createCategory(admin, body.data), 201);
  });
}
