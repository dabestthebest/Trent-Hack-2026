import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  reporter: [
    ["list"],
    ["json", { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE || "test-results/audit.json" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "https://til-loan-day.lovable.app",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-375x812", use: { viewport: { width: 375, height: 812 } } },
    { name: "desktop-1280x900", use: { viewport: { width: 1280, height: 900 } } },
  ],
});
