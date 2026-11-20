import { describe, expect, it } from "vitest";

import { demoBills, demoLoanDate } from "@/lib/money/fixture";
import { computeRunway } from "@/lib/money/runway";
import type { RunwayInput } from "@/lib/money/types";

import { allowedAmounts, keepGroundedTips, pennySummary } from "./pennyAi";

const TODAY = "2026-11-20";
const input: RunwayInput = {
  today: TODAY,
  loanDate: demoLoanDate(TODAY),
  balancePence: 35000,
  overdraftPence: 50000,
  dailySpendPence: 650,
  bills: demoBills(TODAY),
};

describe("Penny AI grounding", () => {
  const result = computeRunway(input);
  if (!result.ok) throw new Error("demo runway should be ok");
  const summary = pennySummary(input, result, null);

  it("summarises only numbers, dates and item names", () => {
    expect(summary).toMatchObject({
      daysToLoan: 52,
      safeDailyPence: 542,
      endBalancePence: -5600,
      firstOverdraftDate: "2027-01-04",
      plan: null,
    });
    expect(summary.bills.map((b) => b.label)).toEqual(["Phone bill", "Train home", "Phone bill"]);
  });

  it("allows amounts from the input and simple differences", () => {
    const allowed = allowedAmounts(summary);
    for (const a of ["£350.00", "£350", "£6.50", "£5.42", "£1.08", "£15.00", "£38.00", "£56.00"]) {
      expect(allowed.has(a)).toBe(true);
    }
    expect(allowed.has("£99.99")).toBe(false);
  });

  it("drops tips with invented amounts and keeps the rest", () => {
    const tips = keepGroundedTips(
      [
        "Cut daily spend from £6.50 to £5.42 and you'll stretch your £350 further before loan day.",
        "Treat yourself to a £99.99 hoodie, you deserve it",
        "Your phone bill (£15.00) lands on 5 Jan, so keep that in mind 📱",
        "No money mentioned here, just vibes ✨",
      ],
      summary,
    );
    expect(tips).toEqual([
      "Cut daily spend from £6.50 to £5.42 and you'll stretch your £350 further before loan day.",
      "Your phone bill (£15.00) lands on 5 Jan, so keep that in mind 📱",
      "No money mentioned here, just vibes ✨",
    ]);
  });
});
