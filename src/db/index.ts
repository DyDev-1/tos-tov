import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

// Reuse one connection pool during development, so hot reload does not open new pools.
const globalForDb = globalThis as unknown as { client?: postgres.Sql };
const client = globalForDb.client ?? postgres(connectionString);
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
