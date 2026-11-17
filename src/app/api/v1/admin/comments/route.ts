import { z } from "zod";
import { jsonData } from "@/lib/api";
import { parseQuery, PRIVATE, withAdmin } from "@/lib/admin-route";
import { listAdminComments } from "@/lib/services/admin";
import { adminListQuerySchema } from "@/lib/validation/admin";

const query = adminListQuerySchema.extend({ status: z.enum(["published", "hidden"]).optional() });

// GET /api/v1/admin/comments?status=&limit=&offset= — comments in any status. Admin only.
export async function GET(request: Request) {
  return withAdmin(async () => {
    const parsed = parseQuery(request, query);
    if ("response" in parsed) return parsed.response;
    const { items, total } = await listAdminComments(parsed.data);
    return jsonData(items, { cache: PRIVATE, meta: { total, limit: parsed.data.limit, offset: parsed.data.offset } });
  });
}
