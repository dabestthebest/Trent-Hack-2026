import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", label: "home" },
  { path: "/dibs", label: "dibs" },
  { path: "/selftest", label: "selftest" },
];
const controls = 'button, a[href], input, [role="button"], [role="link"]';

for (const { path, label } of routes) {
  test(`${path} route audit`, async ({ page }, info) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    const response = await page.goto(path);
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready.then(() => {}));
    const heading = await page.locator("h1").allTextContents();
    const status = response?.status();
    expect.soft(response?.ok(), `HTTP ${status} for ${path}: ${heading.join(", ")}`).toBe(true);
    expect
      .soft(heading.join(" "), `${path} should not be a not-found page`)
      .not.toMatch(/not found|404/i);

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect
      .soft(dimensions.scrollWidth, "Document should fit the viewport")
      .toBeLessThanOrEqual(dimensions.innerWidth);

    await info.attach(`${label} viewport`, {
      path: await screenshot(page, info, label),
      contentType: "image/jpeg",
    });

    const { violations } = await new AxeBuilder({ page }).analyze();
    const impacts = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
    for (const violation of violations) impacts[violation.impact || "unknown"]++;
    console.log(
      `${info.project.name} ${path} HTTP ${status}: axe rules ${JSON.stringify(impacts)}`,
    );

    const keyboard = await auditTabStops(page, info, label);
    expect.soft(keyboard.unreached, "Controls missed by Tab").toEqual([]);
    expect.soft(keyboard.withoutRing, "Tab stops without a visible ring").toEqual([]);
    expect.soft(errors, "Browser error messages").toEqual([]);

    await info.attach("audit", {
      body: JSON.stringify(
        { path, status, heading, dimensions, impacts, violations, keyboard, errors },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });
}

async function screenshot(page, info, label) {
  const path = info.outputPath(`${label}.jpg`);
  await page.screenshot({ path, quality: 70, animations: "disabled" });
  return path;
}

async function auditTabStops(page, info, label) {
  const candidates = await page.locator(controls).evaluateAll((elements) => {
    const indicator = (element) => {
      const css = getComputedStyle(element);
      return {
        outline: css.outline,
        hasOutline:
          !["none", "hidden"].includes(css.outlineStyle) &&
          parseFloat(css.outlineWidth) > 0 &&
          css.outlineColor !== "rgba(0, 0, 0, 0)" &&
          css.outlineColor !== "transparent",
        shadow: css.boxShadow,
      };
    };
    window.auditTabState = { elements, indicator };
    return elements.flatMap((element, index) => {
      if (
        !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ||
        element.matches(":disabled") ||
        element.closest("[inert]")
      )
        return [];
      return [
        {
          index,
          name:
            element.getAttribute("aria-label") ||
            element.labels?.[0]?.textContent.trim() ||
            element.textContent.trim().replace(/\s+/g, " ") ||
            element.outerHTML.slice(0, 160),
          initial: indicator(element),
        },
      ];
    });
  });
  const visited = new Set();
  const withoutRing = [];
  const maxTabs =
    (await page
      .locator(`${controls}, select, textarea, summary, [tabindex], [contenteditable]`)
      .count()) + 5;
  for (let i = 0; i < maxTabs && visited.size < candidates.length; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(async () => {
      const element = document.activeElement;
      const { elements, indicator } = window.auditTabState;
      await Promise.all(
        element
          .getAnimations()
          .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
          .map((animation) => animation.finished.catch(() => {})),
      );
      return { index: elements.indexOf(element), style: indicator(element) };
    });
    const candidate = candidates.find(({ index }) => index === focused.index);
    if (!candidate) continue;
    if (visited.has(candidate.index)) break;
    visited.add(candidate.index);
    const { style } = focused;
    if (
      !(style.hasOutline && style.outline !== candidate.initial.outline) &&
      !(style.shadow !== "none" && style.shadow !== candidate.initial.shadow)
    ) {
      withoutRing.push(candidate.name);
      if (withoutRing.length === 1) {
        await info.attach("First missing focus ring", {
          path: await screenshot(page, info, `${label}-focus`),
          contentType: "image/jpeg",
        });
      }
    }
  }
  return {
    checked: candidates.length,
    unreached: candidates.filter(({ index }) => !visited.has(index)).map(({ name }) => name),
    withoutRing,
  };
}
