import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Understand the "@/..." import alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
