import { defineConfig, devices } from "@playwright/test";

// Fumaça E2E da Breck. Sem E2E_BASE_URL, sobe build + preview local na porta 4173.
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL || "http://localhost:4173";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    // iPhone 13 (viewport/UA/touch) rodando no Chromium: o CI só instala chromium
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: "npm run build && npm run preview -- --port 4173 --strictPort",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 180_000,
      },
});
