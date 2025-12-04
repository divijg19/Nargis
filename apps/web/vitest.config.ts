import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force a single React/DOM instance from the workspace root to avoid
      // jsdom invalid hook calls due to duplicate React copies.
      react: path.resolve(__dirname, "../../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    // Only run unit tests matching *.test.* under tests/
    include: ["tests/**/*.test.{ts,tsx,js,jsx}"],
    // Exclude Playwright/e2e spec files and common config files
    exclude: [
      "**/*.spec.{ts,tsx,js,jsx}",
      "tests/e2e/**",
      "playwright.config.*",
    ],
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    // Reduce worker memory pressure under Bun on Windows
    maxConcurrency: 1,
    coverage: {
      reporter: ["text", "html"],
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/__tests__/**"],
      thresholds: {
        lines: 60,
        statements: 60,
        branches: 50,
        functions: 60,
      },
    },
  },
});
