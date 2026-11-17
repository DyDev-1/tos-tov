import { z } from "zod";
import { jsonData } from "@/lib/api";
import { parseQuery, PRIVATE, withAdmin } from "@/lib/admin-route";
import { listAdminReports } from "@/lib/services/admin";
import { adminListQuerySchema } from "@/lib/validation/admin";

const query = adminListQuerySchema.extend({ status: z.enum(["open", "resolved"]).optional() });

// GET /api/v1/admin/reports?status=open|resolved&limit=&offset= — "Report a problem" messages. Admin only.
export async function GET(request: Request) {
  return withAdmin(async () => {
    const parsed = parseQuery(request, query);
    if ("response" in parsed) return parsed.response;
    const { items, total } = await listAdminReports(parsed.data);
    return jsonData(items, { cache: PRIVATE, meta: { total, limit: parsed.data.limit, offset: parsed.data.offset } });
  });
}
