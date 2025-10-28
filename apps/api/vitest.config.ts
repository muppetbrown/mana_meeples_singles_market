// apps/api/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    hookTimeout: 60_000,      // container + migrations + seed
    testTimeout: 60_000,
    include: ["tests/**/*.{test,spec}.ts"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "lcov", "html", "json"],
      exclude: ["**/tests/**", "**/*.d.ts", "src/database/migrations/**", "src/database/seeds/**"],
      // Coverage thresholds
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
});
