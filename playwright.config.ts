import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: externalBaseUrl ?? "http://localhost:3000", locale: "tr-TR", trace: "off", screenshot: "only-on-failure", serviceWorkers: "block" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: externalBaseUrl ? undefined : {
    command: "npm.cmd run dev -- --hostname localhost --port 3000",
    url: "http://localhost:3000/giris",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
