import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    actionTimeout: 0,
    navigationTimeout: 30_000,
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
  webServer: {
    // Run the monorepo dev script from the repository root so the frontend and
    // any dev backends are available. Ensure NEXT_PUBLIC_ENABLE_DEBUG is set
    // so the dev-only Simulate button is visible during tests.
    command: "npx cross-env NEXT_PUBLIC_ENABLE_DEBUG=true bun run dev:e2e",
    url: "http://localhost:3000",
    cwd: "../../",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
