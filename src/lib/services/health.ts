import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// Service layer: business logic lives here, not in route handlers or pages.
// Route handlers (and later admin routes) call services; services talk to the database.

export type HealthStatus = {
  status: "ok" | "degraded";
  database: "up" | "down";
};

export async function getHealth(): Promise<HealthStatus> {
  try {
    await db.execute(sql`select 1`);
    return { status: "ok", database: "up" };
  } catch {
    return { status: "degraded", database: "down" };
  }
}
