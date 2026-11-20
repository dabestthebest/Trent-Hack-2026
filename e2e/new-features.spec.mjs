import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function activate(page, target, key = "Enter") {
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  const limit =
    (await page.locator("button, a[href], input, select, textarea, summary, [tabindex]").count()) +
    5;
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(target, "Control is reachable with Tab").toBeFocused();
  await page.keyboard.press(key);
}

async function audit(page, info, state) {
  if (info.project.name !== "mobile-375x812") return;
  await page.evaluate(() => document.fonts.ready.then(() => {}));
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  );
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(({ impact }) =>
    ["serious", "critical"].includes(impact),
  );
  for (const violation of violations) {
    const finding = `${state}: ${violation.id}, ${violation.impact}, ${violation.nodes.length} nodes; ${JSON.stringify(violation.nodes.map(({ target }) => target))}`;
    info.annotations.push({ type: "a11y-finding", description: finding });
    console.log(finding);
  }
  await info.attach(`${state}-axe`, {
    body: JSON.stringify({ state, violations }, null, 2),
    contentType: "application/json",
  });
}

test("Runway: upfront rent and parent help sharing via keyboard", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await activate(page, page.getByRole("button", { name: /January rent \(12 weeks upfront\)/i }));
  await expect(page.locator("[data-verdict]")).toBeVisible();
  await expect(
    page.getByText("This would use up your whole overdraft.", { exact: true }),
  ).toBeVisible();
  await audit(page, info, "upfront-rent-preview");
  await activate(page, page.getByRole("button", { name: /ask a parent to help/i }));
  await audit(page, info, "parent-help-expanded");
  await activate(page, page.getByRole("button", { name: /^Mum$/i }));
  await expect(page.locator('a[href^="https://wa.me/?text="]')).toHaveAttribute(
    "href",
    /Hi%20Mum!/,
  );
  await expect(page.locator('a[href^="sms:"]')).toBeVisible();
  await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
  await audit(page, info, "parent-help-mum");
  await activate(page, page.getByRole("button", { name: /^copy$/i }));
  await expect(page.getByRole("button", { name: /^copied!$/i })).toBeVisible();
  await audit(page, info, "parent-help-copied");
});

test("Your numbers: bill presets fill the bill label via keyboard", async ({ page }, info) => {
  await page.goto("/");
  await activate(page, page.getByRole("button", { name: /your numbers/i }));
  const label = page
    .getByRole("form", { name: "Add a bill" })
    .getByRole("textbox", { name: "What", exact: true });
  await activate(page, page.getByRole("button", { name: /rent paid upfront/i }));
  await expect(label).toHaveValue("Rent paid upfront");
  await audit(page, info, "rent-bill-preset");
  await activate(page, page.getByRole("button", { name: /tuition fee instalment/i }));
  await expect(label).toHaveValue("Tuition fee instalment");
  await audit(page, info, "tuition-bill-preset");
});

test("Dibs: upfront rent hands off to Runway via keyboard", async ({ page }, info) => {
  await page.goto("/dibs");
  await activate(page, page.getByRole("button", { name: /^start$/i }));
  await activate(page, page.getByRole("button", { name: /^lock in$/i }));
  await expect(page.getByText(/signing for this house\?/i)).toBeVisible();
  await activate(
    page,
    page.getByRole("radio", { name: "Holding deposit", exact: true }),
    "ArrowRight",
  );
  await expect(page.getByRole("radio", { name: "Pay rent upfront", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByText("12 weeks × £95.00 = £1,140.00", { exact: true })).toBeVisible();
  await audit(page, info, "dibs-upfront-rent");
  const handoff = page
    .getByRole("button", { name: /preview £1,140\.00 in til loan day/i })
    .or(page.getByRole("link", { name: /preview £1,140\.00 in til loan day/i }));
  await activate(page, handoff);
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("[data-verdict]")).toBeVisible();
  await audit(page, info, "dibs-upfront-handoff");
});
