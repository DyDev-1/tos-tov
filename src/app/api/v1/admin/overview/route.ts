import { jsonData } from "@/lib/api";
import { PRIVATE, withAdmin } from "@/lib/admin-route";
import { getAdminOverview } from "@/lib/services/admin";

// GET /api/v1/admin/overview — counts for the admin home page. Admin only.
export async function GET() {
  return withAdmin(async () => jsonData(await getAdminOverview(), { cache: PRIVATE }));
}
