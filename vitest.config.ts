import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "examples/vitest.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
