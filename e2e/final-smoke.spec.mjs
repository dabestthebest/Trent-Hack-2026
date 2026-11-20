import { mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const chromeRoot = "/opt/.devin/chrome/chrome";
const chrome = process.env.CHROME_PATH || (readdirSync(chromeRoot, { withFileTypes: true }).find(e => e.name.startsWith("linux-"))?.name);
test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || (chrome && `${chromeRoot}/${chrome}/chrome-linux64/chrome`) } });
test.setTimeout(90000);
test.use({ actionTimeout: 6000 });

async function visible(locator, description) {
  await expect(locator, `Expected ${description}`).toBeVisible({ timeout: 6000 });
}

async function click(locator, description) {
  await visible(locator, description);
  await locator.click();
}

const checks = [
  ["01-home", "/", async page => {
    const hero = page.getByTestId("safe-per-day");
    await expect(hero, "Expected hero amount £5.42").toContainText("£5.42");
    await visible(page.getByText("a day", { exact: true }).first(), 'hero "a day"');
    await expect.soft(page.getByText(/Penny.s tip/i).first(), "Expected Penny's tip visible").toBeVisible({ timeout: 6000 });
    await expect.soft(page.getByText("Daily quests", { exact: true }), "Expected Daily quests card visible").toBeVisible({ timeout: 6000 });
  }],
  ["02-shift", "/", async page => {
    await click(page.getByRole("button", { name: "Saturday shift · £60 weekly", exact: true }), "Saturday shift · £60 weekly chip");
    await expect(page.getByTestId("safe-per-day"), "Expected hero £14.04 after Saturday shift").toContainText("£14.04");
    await visible(page.locator('[aria-live]').filter({ hasText: /On track for loan day|XP/ }).first(), "celebration live region containing On track for loan day or XP");
  }],
  ["03-parent", "/", async page => {
    await click(page.getByRole("button", { name: /January.*rent|rent.*January/i }), "January rent chip");
    await visible(page.getByText("This would use up your whole overdraft.", { exact: true }), "whole-overdraft warning");
    await page.getByRole("button", { name: "Ask a parent to help", exact: true }).click();
    await page.getByRole("button", { name: "Mum", exact: true }).click();
    await visible(page.getByRole("link").and(page.locator('a[href*="Hi%20Mum!"]')).first(), "WhatsApp link containing Hi%20Mum!");
  }],
  ["04-bills", "/dibs?tab=bills", async page => {
    const expenses = page.getByRole("list", { name: "Shared bills", exact: true }).getByRole("listitem");
    await expect(expenses, "Expected exactly three demo expense rows in Shared bills list").toHaveCount(3, { timeout: 6000 });
    const settle = page.getByRole("region", { name: /settle/i });
    await visible(settle.getByText(/→/).first(), "at least one settle-up → transfer");
    await visible(page.getByRole("link").and(page.locator('a[href^="https://wa.me/?text="]')).first(), "WhatsApp settle-up link");
  }],
  ["05-dibs", "/dibs", async page => {
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.getByRole("button", { name: "Lock in", exact: true }).click();
    for (const price of ["£95.00", "£104.00", "£131.00"]) await visible(page.getByText(price, { exact: true }).first(), `revealed price ${price}`);
  }],
  ["06-blog", "/blog", async (page, visit) => {
    const posts = page.getByRole("article").getByRole("heading", { level: 2 }).getByRole("link");
    await expect(posts, "Expected three linked blog post cards").toHaveCount(3, { timeout: 6000 });
    const href = await posts.first().getAttribute("href");
    await posts.first().click();
    await expect(page, `Expected first post ${href} to open`).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`));
    await visible(page.getByRole("heading", { level: 1 }), "opened blog post heading");
    await visit("first-blog-post", false);
  }],
  ["07-selftest", "/selftest", async page => {
    await expect(page.getByTestId("selftest-total"), "Expected 28/28 PASS engine checks").toHaveText("28/28 PASS", { timeout: 6000 });
  }],
  ["08-page-health", "/", async (page, visit) => {
    for (const path of ["/dibs", "/dibs?tab=bills", "/blog"]) await visit(path);
    const first = page.locator('a[href^="/blog/"]').first();
    await expect.soft(first, "Expected first blog post link for page-health audit").toBeVisible({ timeout: 6000 });
    if (await first.isVisible()) {
      await first.click();
      await visit("first-blog-post", false);
    }
    await visit("/selftest");
  }],
];

for (const [check, route, run] of checks) {
  test(check, async ({ page }, info) => {
    const consoleErrors = [];
    const audits = [];
    page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
    page.on("pageerror", e => consoleErrors.push(e.message));
    const audit = async label => {
      const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      const { violations } = await new AxeBuilder({ page }).analyze();
      const axe = { serious: 0, critical: 0 };
      for (const v of violations) if (v.impact in axe) axe[v.impact]++;
      audits.push({ label, url: page.url(), dimensions, axe, violations: violations.filter(v => v.impact in axe).map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failureSummary: n.failureSummary })) })) });
      expect.soft(dimensions.scrollWidth, `${label}: expected scrollWidth <= clientWidth (${dimensions.clientWidth})`).toBeLessThanOrEqual(dimensions.clientWidth);
    };
    const visit = async (path, navigate = true) => {
      if (navigate) {
        const response = await page.goto(path);
        expect.soft(response?.ok(), `Expected successful HTTP response for ${path}; found ${response?.status()}`).toBe(true);
      }
      await page.evaluate(() => document.fonts.ready.then(() => {}));
      await audit(path);
    };
    try {
      await visit(route);
      await run(page, visit);
    } finally {
      await audit("final-state");
      expect.soft(consoleErrors, "Expected no browser console errors or uncaught exceptions").toEqual([]);
      const directory = fileURLToPath(new URL("../docs/smoke", import.meta.url));
      mkdirSync(directory, { recursive: true });
      const viewport = info.project.name.replace(/^(mobile|desktop)-/, "");
      await page.screenshot({ path: `${directory}/${check}-${viewport}.png`, fullPage: true, animations: "disabled" });
      await info.attach("smoke-result", { body: JSON.stringify({ check, viewport, audits, consoleErrors, pageText: (await page.locator("body").innerText()).slice(0, 20000) }), contentType: "application/json" });
    }
  });
}
