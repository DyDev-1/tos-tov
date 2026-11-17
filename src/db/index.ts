import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { postgresOptions } from "./connection";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

// Reuse one connection pool during development, so hot reload does not open new pools.
// In production each server instance keeps only a few connections (the Supabase pooler shares them).
const globalForDb = globalThis as unknown as { client?: postgres.Sql };
const client =
  globalForDb.client ??
  postgres(connectionString, postgresOptions(connectionString, { max: process.env.NODE_ENV === "production" ? 3 : 10 }));
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
