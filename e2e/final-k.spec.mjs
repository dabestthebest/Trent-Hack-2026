import { mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const chromeRoot = "/opt/.devin/chrome/chrome";
const executablePath = process.env.CHROME_PATH || `${chromeRoot}/${readdirSync(chromeRoot).find(name => name.startsWith("linux-"))}/chrome-linux64/chrome`;
test.use({ launchOptions: { executablePath }, actionTimeout: 6000 });
test.setTimeout(60000);

const checks = [
  ["predictor", async page => {
    const section = page.getByRole("region", { name: /Predict my everyday spending/ });
    await expect(section, "Expected Predict my everyday spending section").toBeVisible();
    await section.getByRole("textbox", { name: "Your habits", exact: true }).fill(
      "I buy a £3.50 meal deal five times a week, a £3 coffee four times a week, and spend £22.20 on groceries each week.",
    );
    await section.getByRole("button", { name: "Predict", exact: true }).click();
    await expect(section.getByText(/AI's prediction|add your habits by hand/).first(),
      "Expected AI's prediction or add your habits by hand within 30 seconds",
    ).toBeVisible({ timeout: 30000 });
  }],
  ["ious", async page => {
    const section = page.getByRole("region", { name: /Small IOUs/ });
    await expect(section, "Expected Small IOUs section").toBeVisible();
    await expect(section.getByText("Sam owes you £0.80 for crisps", { exact: true }),
      "Expected demo: Sam owes you £0.80 for crisps").toBeVisible();
    await expect(section.getByText("You owe Alex a lift to the station", { exact: true }),
      "Expected demo: You owe Alex a lift to the station").toBeVisible();
    const nudge = section.getByRole("link", { name: "Friendly nudge", exact: true });
    await expect(nudge, "Expected Friendly nudge WhatsApp link").toBeVisible();
    await expect(nudge, "Expected WhatsApp href beginning https://wa.me/?text=Hey%20Sam!")
      .toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=Hey%20Sam!/);
  }],
  ["privacy", async page => {
    await expect(page.getByText("Nothing is saved in the cloud", { exact: false }).first(),
      'Expected privacy banner text containing "Nothing is saved in the cloud"',
    ).toBeVisible({ timeout: 6000 });
  }],
  ["friends", async page => {
    await expect(page.getByRole("heading", { name: /^(?:[^\p{L}\p{N}]*\s*)?Friends$/u }),
      "Expected Friends section heading",
    ).toBeVisible({ timeout: 6000 });
  }],
];

for (const [check, run] of checks) {
  test(`k-${check}`, async ({ page }, info) => {
    const startedAt = new Date().toISOString();
    const consoleErrors = [];
    const dimensions = [];
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", error => consoleErrors.push(error.message));
    const auditWidth = async state => {
      const size = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      dimensions.push({ state, ...size });
      expect.soft(size.scrollWidth, `${state}: expected scrollWidth <= clientWidth (${size.clientWidth})`).toBeLessThanOrEqual(size.clientWidth);
    };
    try {
      const response = await page.goto("/");
      expect.soft(response?.ok(), `Expected successful home response; found HTTP ${response?.status()}`).toBe(true);
      await page.getByTestId("safe-per-day").waitFor();
      await page.evaluate(() => document.fonts.ready.then(() => {}));
      await auditWidth("initial");
      await run(page);
    } finally {
      await auditWidth("final");
      expect.soft(consoleErrors, "Expected no console errors or uncaught exceptions").toEqual([]);
      const directory = fileURLToPath(new URL("../docs/smoke", import.meta.url));
      mkdirSync(directory, { recursive: true });
      const screenshot = `${directory}/k-${check}-375x812.png`;
      await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
      await info.attach("smoke-result", {
        body: JSON.stringify({ check: `k-${check}`, viewport: "375x812", startedAt,
          finishedAt: new Date().toISOString(), url: page.url(), consoleErrors, dimensions,
          pageText: await page.locator("body").innerText(), screenshot }),
        contentType: "application/json",
      });
    }
  });
}
