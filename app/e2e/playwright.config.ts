import { defineConfig, devices } from "@playwright/test";

// Runs the web app (built with NEXT_PUBLIC_API_BASE=http://localhost:8000/v1)
// against serve_api.py: the real API, Redis, Postgres and FFmpeg, with the
// fixture extractor instead of yt-dlp. See README.md.
export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  fullyParallel: true,
  workers: 4,
  reporter: [["list"], ["json", { outputFile: "results.json" }]],
  use: {
    baseURL: "http://localhost:3000",
    acceptDownloads: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: "../api/.venv/bin/python serve_api.py",
      url: "http://localhost:8000/health",
      reuseExistingServer: true,
      timeout: 60_000,
      env: { LANG: "C.UTF-8" },
    },
    {
      command: "npm --prefix ../web run start -- -p 3000",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
