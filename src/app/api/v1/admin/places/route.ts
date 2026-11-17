import { jsonData } from "@/lib/api";
import { parseQuery, PRIVATE, withAdmin } from "@/lib/admin-route";
import { listAdminPlaces } from "@/lib/services/admin";
import { adminListQuerySchema, placeStatusSchema } from "@/lib/validation/admin";

const query = adminListQuerySchema.extend({ status: placeStatusSchema.optional() });

// GET /api/v1/admin/places?status=pending|published|hidden&q=&limit=&offset= — every place, any status. Admin only.
export async function GET(request: Request) {
  return withAdmin(async () => {
    const parsed = parseQuery(request, query);
    if ("response" in parsed) return parsed.response;
    const { items, total } = await listAdminPlaces(parsed.data);
    return jsonData(items, { cache: PRIVATE, meta: { total, limit: parsed.data.limit, offset: parsed.data.offset } });
  });
}
