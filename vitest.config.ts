import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "apps/api/tests/**/*.test.ts"],
    // Database suites share one disposable schema. Workers consume a global
    // outbox, so parallel test files could claim each other's fixtures.
    fileParallelism: process.env.RUN_DATABASE_INTEGRATION_TESTS !== "true",
    coverage: { reporter: ["text", "json", "html"] },
  },
});
