import { expect, test } from "@playwright/test";

const button = (page, name) => page.getByRole("button", { name, exact: true });

test("Dibs: start, lock in, reveal three rents, and edit via keyboard", async ({ page }, info) => {
  const response = await page.goto("/dibs");
  if (response?.status() === 404) {
    const legacy = await page.goto("/");
    expect(legacy?.ok(), "Legacy Dibs home should load").toBe(true);
    info.annotations.push({ type: "legacy", description: "Dibs lives at / on this build" });
  }

  const start = button(page, "Start");
  const lockIn = button(page, "Lock in");
  // SSR renders Start before TanStack finishes loading the client-side route bundle.
  await page.waitForLoadState("networkidle");
  await tabAndActivate(page, start);
  await tabAndActivate(page, lockIn);

  await expect(page.getByRole("heading", { name: /here.s the fair split/i })).toBeVisible();
  const rents = page.getByRole("list", { name: "Rooms and rents" }).getByRole("button");
  await expect(rents).toHaveCount(3);
  for (const rent of await rents.all()) {
    await expect(rent).toHaveAccessibleName(/£\d[\d,]*\.\d{2} per week/i);
    await expect(rent.getByText(/^£\d[\d,]*\.\d{2}$/)).toBeVisible();
  }

  const path = info.outputPath("dibs-reveal.jpg");
  await page.screenshot({ path, quality: 70, animations: "disabled" });
  await info.attach("Dibs reveal", { path, contentType: "image/jpeg" });

  await tabAndActivate(page, button(page, "Edit answers"));
  await expect(lockIn).toBeVisible();
});

test("Runway: open a Can I say yes? preview and Skip it via keyboard", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await page.waitForLoadState("networkidle");
  const title = page.getByText(/^Can I say yes\?$/i).first();
  try {
    await title.waitFor({ state: "visible", timeout: 4000 });
  } catch (error) {
    if (error.name !== "TimeoutError") throw error;
    test.skip(true, "This build does not have a visible Can I say yes? section");
  }

  // The chips live just after the section's label; avoid binding to preset expense names.
  const chips = title.locator("xpath=ancestor::*[.//button][1]").getByRole("button");
  const chip = chips.first();
  await expect(chip, "Can I say yes? should offer a keyboard-operable chip").toBeVisible();
  const skip = button(page, "Skip it");
  await expect(skip).toBeHidden();
  await tabAndActivate(page, chip);
  await expect(
    skip,
    "Opening a chip should show the preview with its Skip it action",
  ).toBeVisible();
  await tabAndActivate(page, skip);
  await expect(skip).toBeHidden();
  await expect(chip).toBeVisible();
});

async function tabAndActivate(page, target) {
  await expect(target).toBeVisible();
  const maxTabs =
    (await page.locator("button, a[href], input, select, textarea, [tabindex]").count()) + 5;
  for (
    let i = 0;
    i < maxTabs && !(await target.evaluate((el) => el === document.activeElement));
    i++
  ) {
    await page.keyboard.press("Tab");
  }
  await expect(target, "The control should receive focus using Tab alone").toBeFocused();
  await page.keyboard.press("Enter");
}
