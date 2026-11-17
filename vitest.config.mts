import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Integration tests use their own database, never your development one.
// CI can point somewhere else with TEST_DATABASE_URL.
process.env.TEST_DATABASE_URL ??= "postgres://tostov:tostov@localhost:5432/tostov_test";
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Understand the "@/..." import alias from tsconfig.json.
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    environment: "node",
    env: { DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: ["./tests/support/db-setup.ts"],
    // Integration test files share one database, so run files one after another.
    fileParallelism: false,
  },
});
