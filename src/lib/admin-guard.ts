import "server-only";
import type { UserRow } from "@/db/schema";
import { forbidden, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

// First line of every admin API route:
//   const guard = await adminGuard();
//   if ("response" in guard) return guard.response;
//   const { admin } = guard;
// Not logged in: 401. Logged in but not an admin (or banned): 403. The check is on the server, always.
export async function adminGuard(): Promise<{ admin: UserRow } | { response: Response }> {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  if (user.role !== "admin" || user.bannedAt) return { response: forbidden() };
  return { admin: user };
}
