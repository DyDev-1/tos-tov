import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type UserRow } from "@/db/schema";

export type Profile = { name: string; email: string | null };

// Find our copy of a Clerk account, or create it the first time the person does something
// that needs one (like, save, comment, add a place). `loadProfile` asks Clerk for the name,
// and is only called when the user does not exist yet.
export async function ensureUser(clerkId: string, loadProfile: () => Promise<Profile>): Promise<UserRow> {
  const [existing] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (existing) return existing;

  const profile = await loadProfile();
  const [created] = await db
    .insert(users)
    .values({ clerkId, name: profile.name, email: profile.email })
    .onConflictDoNothing({ target: users.clerkId })
    .returning();
  if (created) return created;
  // Two requests created the user at the same moment: read the one that won.
  const [winner] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return winner;
}
