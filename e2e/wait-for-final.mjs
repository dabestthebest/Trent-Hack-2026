import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const base = process.env.BASE_URL || "https://til-loan-day.lovable.app";
const chromeRoot = "/opt/.devin/chrome/chrome";
const executablePath = process.env.CHROME_PATH || `${chromeRoot}/${readdirSync(chromeRoot).find(n => n.startsWith("linux-"))}/chrome-linux64/chrome`;
const browser = await chromium.launch({ executablePath });
try {
  while (true) {
    try {
      execFileSync("git", ["fetch", "origin"], { cwd: root, stdio: "pipe" });
      if (execFileSync("git", ["rev-parse", "--is-shallow-repository"], { cwd: root, encoding: "utf8" }).trim() === "true") {
        execFileSync("git", ["fetch", "--unshallow", "origin"], { cwd: root, stdio: "pipe" });
      }
      const subjects = execFileSync("git", ["log", "origin/main", "--format=%s"], { cwd: root, encoding: "utf8" });
      const page = await browser.newPage();
      let ready = false;
      try {
        await page.goto(new URL("/selftest", base).href);
        await page.getByTestId("selftest-total").filter({ hasText: /^28\/28 PASS$/ }).waitFor({ timeout: 10000 });
        ready = true;
      } catch (error) {
        console.log(`Selftest not ready: ${error.message.split("\n")[0]}`);
      } finally { await page.close(); }
      if (subjects.includes("Til Loan Day: final features") && ready) {
        console.log("Ready: origin/main contains final features and live selftest shows 28/28 PASS");
        break;
      }
      console.log(`Waiting: final commit=${subjects.includes("Til Loan Day: final features")}, live selftest=${ready}`);
    } catch (error) { console.error(error.message); }
    await delay(60000);
  }
} finally { await browser.close(); }
