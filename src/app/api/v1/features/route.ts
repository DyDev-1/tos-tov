import { jsonData } from "@/lib/api";
import { capabilityMap, getReleaseStage } from "@/lib/release-stage";

// GET /api/v1/features — which release stage is running and what is open to regular people.
// Public (a future mobile app reads it too). Admins can always do everything, whatever the stage.
export async function GET() {
  const stage = getReleaseStage();
  return jsonData({ stage, capabilities: capabilityMap(stage) }, { cache: "public, max-age=60, s-maxage=60" });
}
