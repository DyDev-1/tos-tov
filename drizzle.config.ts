import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // PostGIS creates its own tables (e.g. spatial_ref_sys); tell Drizzle to leave them alone.
  extensionsFilters: ["postgis"],
});
