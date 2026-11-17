import { jsonData, jsonError, REFERENCE_CACHE } from "@/lib/api";
import { listProvinces } from "@/lib/services/reference";

// GET /api/v1/provinces — all provinces, popular first. Response: { data: Province[] }
export async function GET() {
  try {
    return jsonData(await listProvinces(), { cache: REFERENCE_CACHE });
  } catch (error) {
    console.error("GET /api/v1/provinces failed", error);
    return jsonError(500, "internal_error", "Could not load provinces");
  }
}
