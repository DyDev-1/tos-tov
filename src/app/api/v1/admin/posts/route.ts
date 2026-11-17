import { z } from "zod";
import { jsonData } from "@/lib/api";
import { parseQuery, PRIVATE, withAdmin } from "@/lib/admin-route";
import { listAdminPosts } from "@/lib/services/admin";
import { adminListQuerySchema } from "@/lib/validation/admin";

const query = adminListQuerySchema.extend({ status: z.enum(["pending", "published", "hidden"]).optional() });

// GET /api/v1/admin/posts?status=&limit=&offset= — posts in any status. Admin only.
export async function GET(request: Request) {
  return withAdmin(async () => {
    const parsed = parseQuery(request, query);
    if ("response" in parsed) return parsed.response;
    const { items, total } = await listAdminPosts(parsed.data);
    return jsonData(items, { cache: PRIVATE, meta: { total, limit: parsed.data.limit, offset: parsed.data.offset } });
  });
}
