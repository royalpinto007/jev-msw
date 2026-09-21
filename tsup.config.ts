import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/node.ts", "src/vitest.ts", "src/jest.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ["msw", "msw/node", "vitest", "@jest/globals"],
  outExtension({ format }) {
    return format === "cjs" ? { js: ".cjs" } : { js: ".js" };
  },
});
