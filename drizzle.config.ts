import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { migrationUrl } from "./src/db/connection";

// ENV_FILE=.env.staging npm run db:migrate  targets another database without touching .env.local
config({ path: process.env.ENV_FILE ?? ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // DIRECT_URL (Supabase direct or session pooler) when set, otherwise DATABASE_URL.
    url: migrationUrl()!,
  },
  // PostGIS creates its own tables (e.g. spatial_ref_sys); tell Drizzle to leave them alone.
  extensionsFilters: ["postgis"],
});
