import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { UserRow } from "@/db/schema";
import { ensureUser } from "@/lib/services/users";

// The logged-in person as a row in our database, or null when nobody is logged in.
// Clerk checks the login. We never handle passwords.
export async function getCurrentUser(): Promise<UserRow | null> {
  const { userId } = await auth();
  if (!userId) return null;

  return ensureUser(userId, async () => {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || email?.split("@")[0] || "Traveller";
    return { name, email };
  });
}

// Admin pages and routes must call one of these on the server. Hiding a button is not enough.
// A banned admin is no admin.
export async function requireAdmin(): Promise<UserRow | null> {
  const user = await getCurrentUser();
  return user?.role === "admin" && !user.bannedAt ? user : null;
}
