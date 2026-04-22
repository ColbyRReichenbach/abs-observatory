import { defineConfig, devices } from "@playwright/test";
import { loadTestEnvValue } from "./tests/e2e/env";

const workerToken = loadTestEnvValue("INTERNAL_WORKER_TOKEN") ?? process.env.INTERNAL_WORKER_TOKEN ?? "playwright-worker-token";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- -p 4173",
    port: 4173,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      INTERNAL_WORKER_TOKEN: workerToken,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY_E2E ?? "test-disabled",
    },
  },
});
