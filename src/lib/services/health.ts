import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import pkg from "../../../package.json";

// Service layer: business logic lives here, not in route handlers or pages.
// Route handlers (and later admin routes) call services; services talk to the database.

export type HealthStatus = {
  status: "ok" | "degraded";
  database: "up" | "down";
  /** The release number from package.json, so you can see which version is live. */
  version: string;
  /** The first 7 letters of the commit that was deployed (set by the host; empty on your own computer). */
  commit: string | null;
};

const version = pkg.version;
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "").slice(0, 7) || null;

export async function getHealth(): Promise<HealthStatus> {
  try {
    await db.execute(sql`select 1`);
    return { status: "ok", database: "up", version, commit };
  } catch {
    return { status: "degraded", database: "down", version, commit };
  }
}
