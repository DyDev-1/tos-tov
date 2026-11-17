import { jsonData, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

// GET /api/v1/me — who is logged in, and whether they are an admin. Private, never cached.
// The site header uses it to show the "Admin" link to admins only. (The admin pages check the role again on the server.)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return jsonData(
      { name: user.name, role: user.role, banned: user.bannedAt !== null },
      { cache: "private, no-store" },
    );
  } catch (error) {
    console.error("GET /api/v1/me failed", error);
    return jsonError(500, "internal_error", "Could not load your account");
  }
}
