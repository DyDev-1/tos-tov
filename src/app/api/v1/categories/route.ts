import { jsonData, jsonError, REFERENCE_CACHE } from "@/lib/api";
import { listCategories } from "@/lib/services/reference";

// GET /api/v1/categories — all categories in display order. Response: { data: Category[] }
export async function GET() {
  try {
    return jsonData(await listCategories(), { cache: REFERENCE_CACHE });
  } catch (error) {
    console.error("GET /api/v1/categories failed", error);
    return jsonError(500, "internal_error", "Could not load categories");
  }
}
