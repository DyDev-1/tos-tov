import { getHealth } from "@/lib/services/health";

// GET /api/v1/health — quick check that the app and database are running.
// Route handler layer: read the request, call a service, return a public JSON shape.
export async function GET() {
  const health = await getHealth();
  return Response.json(health, { status: health.status === "ok" ? 200 : 503 });
}
