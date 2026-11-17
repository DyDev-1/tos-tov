import { z } from "zod";
import { jsonData } from "@/lib/api";
import { parseQuery, PRIVATE, withAdmin } from "@/lib/admin-route";
import { listAuditLog } from "@/lib/services/admin";

const query = z.object({
  targetType: z.string().max(30).optional(),
  targetId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/v1/admin/audit-log?targetType=&targetId=&limit=&offset= — what admins did, newest first. Admin only.
export async function GET(request: Request) {
  return withAdmin(async () => {
    const parsed = parseQuery(request, query);
    if ("response" in parsed) return parsed.response;
    const { items, total } = await listAuditLog(parsed.data);
    return jsonData(items, { cache: PRIVATE, meta: { total, limit: parsed.data.limit, offset: parsed.data.offset } });
  });
}
