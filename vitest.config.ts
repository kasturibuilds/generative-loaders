import { defineConfig } from "vitest/config";

export default defineConfig({
  // Keep tests on the same JSX runtime as the published package.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["packages/generative-loaders/tests/**/*.test.{ts,tsx}"],
  },
});
