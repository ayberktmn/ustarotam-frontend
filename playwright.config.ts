import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", locale: "tr-TR", trace: "off", screenshot: "only-on-failure", serviceWorkers: "block" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm.cmd run dev -- --hostname localhost --port 3000",
    url: "http://localhost:3000/giris",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
