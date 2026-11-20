import { expect, test } from "@playwright/test";

const button = (page, name) => page.getByRole("button", { name });

async function open(page, path) {
  const response = await page.goto(path);
  expect(response?.ok(), `${path} should load`).toBe(true);
  await page.waitForLoadState("networkidle");
}

async function expectPreview(page, timeout = 5000) {
  await expect(page.locator("[data-verdict]")).toBeVisible({ timeout });
  await expect(
    page.getByRole("heading", { level: 3 }).and(page.locator("#preview-heading")),
  ).toBeFocused();
  await expect(page.getByTestId("reply-text")).toBeVisible();
  await expect(page.getByTestId("reply-text")).not.toBeEmpty();
  test.info().annotations.push({
    type: "a11y-finding",
    description:
      "PlanPreviewCard.tsx:128-145: axe definition-list (1 node) and dlitem (6 nodes), serious; nested div separates dt/dd from dl.",
  });
}

test("Runway: chip opens a preview and Skip it dismisses it via keyboard", async ({ page }) => {
  await open(page, "/");
  await expect(page.getByTestId("safe-per-day")).toBeVisible();
  const chip = button(page, /winter ball.*£55/i);
  await expect(page.locator("[data-verdict]")).toBeHidden();
  await tabAndActivate(page, chip);
  await expectPreview(page);
  await tabAndActivate(page, button(page, /^skip it$/i), "Space");
  await expect(page.locator("[data-verdict]")).toBeHidden();
  await expect(chip).toBeVisible();
});

test("Runway: example invite reaches an AI or on-device preview via keyboard", async ({ page }) => {
  await open(page, "/");
  await tabAndActivate(page, button(page, /try an example/i));
  await tabAndActivate(page, button(page, /^read it$/i));
  const deadline = Date.now() + 12000;
  await tabAndActivate(page, button(page, /looks right,? preview it/i), "Enter", 12000);
  await expectPreview(page, Math.max(1, deadline - Date.now()));
  const source = await page
    .getByRole("form", { name: "Check what we read" })
    .getByRole("status")
    .innerText();
  test.info().annotations.push({ type: "invite-source", description: source });
  console.log(`${test.info().project.name} invite source: ${source}`);
});

test("Dibs: Start, Lock in, reveal and holding-deposit hand-off via keyboard", async ({ page }) => {
  await open(page, "/dibs");
  await tabAndActivate(page, button(page, /^start$/i));
  await annotateLostFocus(page, "Start");
  const handoff = button(page, /preview £95\.00 in til loan day/i).or(
    page.getByRole("link", { name: /preview £95\.00 in til loan day/i }),
  );
  const lockIn = button(page, /^lock in$/i);
  const ready = button(
    page,
    /^(i.?m .*,? ready|i.?m ready|ready|reveal(?: the (?:split|results))?)$/i,
  );
  let locks = 0;
  for (let step = 0; step < 8; step++) {
    await expect(handoff.or(lockIn).or(ready).first()).toBeVisible();
    if (await handoff.isVisible()) break;
    if (await lockIn.isVisible()) {
      await tabAndActivate(page, lockIn);
      await annotateLostFocus(page, "Lock in");
      locks++;
    } else {
      await tabAndActivate(page, ready);
    }
  }
  expect(locks, "At least one housemate must lock in answers").toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: /here.s the fair split|reveal/i })).toBeVisible();
  await expect(page.getByText(/signing for this house\?/i)).toBeVisible();
  await tabAndActivate(page, handoff);
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expectPreview(page);
});

async function annotateLostFocus(page, step) {
  if (await page.evaluate(() => document.activeElement === document.body)) {
    test.info().annotations.push({
      type: "a11y-finding",
      description: `DibsApp.tsx:33-36: after ${step}, focus falls to body; go() scrolls but does not focus the new screen heading or announce it.`,
    });
  }
}

async function tabAndActivate(page, target, key = "Enter", timeout = 5000) {
  await expect(target).toBeVisible({ timeout });
  await expect(target).toBeEnabled();
  const maxTabs =
    (await page.locator("button, a[href], input, select, textarea, summary, [tabindex]").count()) +
    5;
  for (let i = 0; i < maxTabs; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(target, "The control should receive focus using Tab alone").toBeFocused();
  await page.keyboard.press(key);
}
