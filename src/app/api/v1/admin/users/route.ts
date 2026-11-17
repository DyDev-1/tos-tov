import { z } from "zod";
import { jsonData } from "@/lib/api";
import { parseQuery, PRIVATE, withAdmin } from "@/lib/admin-route";
import { listAdminUsers } from "@/lib/services/admin";
import { adminListQuerySchema } from "@/lib/validation/admin";

const query = adminListQuerySchema.extend({ status: z.literal("banned").optional() });

// GET /api/v1/admin/users?q=&status=banned&limit=&offset= — people, with emails. Admin only.
export async function GET(request: Request) {
  return withAdmin(async () => {
    const parsed = parseQuery(request, query);
    if ("response" in parsed) return parsed.response;
    const { items, total } = await listAdminUsers(parsed.data);
    return jsonData(items, { cache: PRIVATE, meta: { total, limit: parsed.data.limit, offset: parsed.data.offset } });
  });
}
