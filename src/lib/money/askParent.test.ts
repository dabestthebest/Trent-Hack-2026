import { describe, expect, it } from "vitest";

import {
  askParentMessage,
  askParentSubject,
  impactPhrase,
  isBigBill,
  poundsWithCommas,
  shareLinks,
  type AskParentInput,
} from "./askParent";
import {
  DEMO_BALANCE_PENCE,
  DEMO_DAILY_SPEND_PENCE,
  DEMO_OVERDRAFT_PENCE,
  demoBills,
  demoLoanDate,
  demoPlans,
} from "./fixture";
import { previewPlan } from "./runway";
import type { Plan, PlanPreview, RunwayInput } from "./types";

// The spec's acceptance fixture (today Fri 20 Nov 2026, loan day Mon 18 Jan 2027).
const TODAY = "2026-11-20";
const BASE: RunwayInput = {
  today: TODAY,
  loanDate: "2027-01-18",
  balancePence: 40000,
  overdraftPence: 50000,
  dailySpendPence: 650,
  bills: [
    { id: "a", label: "Phone", amountPence: 1500, date: "2026-12-05" },
    { id: "b", label: "Train home", amountPence: 3800, date: "2026-12-17" },
    { id: "c", label: "Phone", amountPence: 1500, date: "2027-01-05" },
  ],
};

function preview(plan: Plan, patch: Partial<RunwayInput> = {}): PlanPreview {
  const p = previewPlan({ ...BASE, ...patch }, plan);
  if (p === null) throw new Error("base runway should be ok");
  return p;
}

const BALL: Plan = { label: "Winter ball", amountPence: 5500, date: "2026-12-04" };

const RENT_MESSAGE =
  "Hi Mum! I've got a big bill coming up: January rent (12 weeks upfront), £1,140.00, due Fri 1 Jan. I'm not expecting my next student loan payment until Mon 11 Jan, and paying it from my own money would use up my whole overdraft. Could you help with some or all of it? I can show you the numbers. Thank you 💛";

describe("isBigBill", () => {
  it("counts anything from £100 up, whatever it's called", () => {
    expect(isBigBill({ label: "New laptop", amountPence: 10000 })).toBe(true);
    expect(isBigBill({ label: "Festival ticket", amountPence: 25000 })).toBe(true);
    expect(isBigBill({ label: "New laptop", amountPence: 9999 })).toBe(false);
    expect(isBigBill({ label: "Phone bill", amountPence: 1500 })).toBe(false);
  });

  it("counts rent, housing, halls, deposits, tuition and fees at any amount", () => {
    for (const label of [
      "Rent",
      "January rent (12 weeks upfront)",
      "Rent paid upfront",
      "Housing",
      "Accommodation balance",
      "Halls top-up",
      "Holding deposit",
      "Tuition fee instalment",
      "Lab fees",
      "Fee",
      "RENT",
    ]) {
      expect(isBigBill({ label, amountPence: 500 }), label).toBe(true);
    }
  });

  it("matches whole words only", () => {
    for (const label of ["Parents' evening", "Coffee", "Rental car", "Feeling fancy", "Rented"]) {
      expect(isBigBill({ label, amountPence: 500 }), label).toBe(false);
    }
  });
});

describe("impactPhrase", () => {
  it("is null when the plan is affordable or outside the runway", () => {
    const fine = preview(BALL, { dailySpendPence: 400 });
    expect(fine.verdict).toBe("fine");
    expect(impactPhrase(fine)).toBeNull();

    const later = preview({ label: "Gig", amountPence: 3000, date: "2027-01-20" });
    expect(later.verdict).toBe("outside-window");
    expect(impactPhrase(later)).toBeNull();
  });

  it("uses up the whole overdraft", () => {
    const ski = preview({ label: "Ski trip deposit", amountPence: 45000, date: "2026-12-12" });
    expect(ski.verdict).toBe("exhausted");
    expect(impactPhrase(ski)).toBe("use up my whole overdraft");
  });

  it("pushes into the overdraft when there wasn't one", () => {
    const p = preview(BALL, { dailySpendPence: 500 });
    expect([p.verdict, p.causesOverdraft]).toEqual(["overdraft", true]);
    expect(impactPhrase(p)).toBe("push me into my overdraft");
  });

  it("brings the overdraft forward by n days, with a singular for 1", () => {
    const p = preview(BALL);
    expect([p.verdict, p.daysEarlierOverdraft]).toEqual(["overdraft", 7]);
    expect(impactPhrase(p)).toBe("put me in my overdraft 7 days sooner");
    expect(impactPhrase({ ...p, daysEarlierOverdraft: 1 })).toBe(
      "put me in my overdraft 1 day sooner",
    );
  });

  it("otherwise goes further into the overdraft", () => {
    const p = preview(BALL);
    expect(impactPhrase({ ...p, daysEarlierOverdraft: 0 })).toBe(
      "take me further into my overdraft",
    );
    expect(impactPhrase({ ...p, daysEarlierOverdraft: null })).toBe(
      "take me further into my overdraft",
    );
  });
});

describe("poundsWithCommas", () => {
  it("adds thousands separators and always shows pence", () => {
    expect(poundsWithCommas(114000)).toBe("£1,140.00");
    expect(poundsWithCommas(0)).toBe("£0.00");
    expect(poundsWithCommas(5)).toBe("£0.05");
    expect(poundsWithCommas(99999)).toBe("£999.99");
    expect(poundsWithCommas(100000)).toBe("£1,000.00");
    expect(poundsWithCommas(925000)).toBe("£9,250.00");
    expect(poundsWithCommas(123456789)).toBe("£1,234,567.89");
    expect(poundsWithCommas(-114000)).toBe("−£1,140.00");
  });
});

describe("askParentMessage", () => {
  const rent: AskParentInput = {
    name: "Mum",
    label: "January rent (12 weeks upfront)",
    amountPence: 114000,
    date: "2027-01-01",
    loanDate: "2027-01-11",
    impact: "use up my whole overdraft",
  };

  it("matches the spec example word for word", () => {
    expect(askParentMessage(rent)).toBe(RENT_MESSAGE);
  });

  it("says a plain Hi! without a name, and trims the name", () => {
    expect(askParentMessage({ ...rent, name: "" })).toMatch(
      /^Hi! I've got a big bill coming up: January rent/,
    );
    expect(askParentMessage({ ...rent, name: "   " })).toMatch(/^Hi! /);
    expect(askParentMessage({ ...rent, name: "  Dad " })).toMatch(/^Hi Dad! /);
  });

  it("mentions loan day without an impact", () => {
    expect(askParentMessage({ ...rent, name: "Gran", impact: null })).toBe(
      "Hi Gran! I've got a big bill coming up: January rent (12 weeks upfront), £1,140.00, due Fri 1 Jan. I'm not expecting my next student loan payment until Mon 11 Jan. Could you help with some or all of it? I can show you the numbers. Thank you 💛",
    );
  });

  it("gives the impact on its own when there's no loan day before the bill", () => {
    const noLoan = askParentMessage({ ...rent, loanDate: null });
    expect(noLoan).toBe(
      "Hi Mum! I've got a big bill coming up: January rent (12 weeks upfront), £1,140.00, due Fri 1 Jan. Paying it from my own money would use up my whole overdraft. Could you help with some or all of it? I can show you the numbers. Thank you 💛",
    );
    // A bill on or after loan day doesn't mention the loan.
    const onLoanDay = askParentMessage({ ...rent, date: "2027-01-11" });
    expect(onLoanDay).not.toContain("student loan");
    expect(onLoanDay).toContain(" Paying it from my own money would use up my whole overdraft.");
  });

  it("is just the ask when there's nothing else to say", () => {
    expect(
      askParentMessage({
        name: "",
        label: "Tuition fee instalment",
        amountPence: 92500,
        date: "2027-02-01",
        loanDate: null,
        impact: null,
      }),
    ).toBe(
      "Hi! I've got a big bill coming up: Tuition fee instalment, £925.00, due Mon 1 Feb. Could you help with some or all of it? I can show you the numbers. Thank you 💛",
    );
  });

  it("ends with exactly one emoji", () => {
    const msg = askParentMessage(rent);
    expect(msg.endsWith("Thank you 💛")).toBe(true);
    expect(msg.match(/\p{Extended_Pictographic}/gu)).toEqual(["💛"]);
  });

  it("never throws on an odd date", () => {
    expect(askParentMessage({ ...rent, date: "not a date" })).toContain(
      "January rent (12 weeks upfront), £1,140.00. ",
    );
  });
});

describe("askParentSubject", () => {
  it("names the bill", () => {
    expect(askParentSubject("January rent")).toBe("Could you help with January rent?");
    expect(askParentSubject("  ")).toBe("Could you help with a bill?");
  });
});

describe("shareLinks", () => {
  const message = "Hi Mum! £1,140.00 due Fri 1 Jan & more? Thank you 💛";
  const links = shareLinks(message, "Could you help with rent?", "https://example.app");
  const enc = encodeURIComponent(message);

  it("builds each app's link with the message encoded", () => {
    expect(links.whatsapp).toBe(`https://wa.me/?text=${enc}`);
    expect(links.sms).toBe(`sms:?&body=${enc}`);
    expect(links.email).toBe(`mailto:?subject=Could%20you%20help%20with%20rent%3F&body=${enc}`);
    expect(links.telegram).toBe(`https://t.me/share/url?url=https%3A%2F%2Fexample.app&text=${enc}`);
  });

  it("encodes the pound sign, commas, ampersands and emoji", () => {
    expect(links.whatsapp).toContain("Hi%20Mum!");
    expect(links.whatsapp).toContain("%C2%A31%2C140.00");
    expect(links.whatsapp).toContain("%26%20more%3F");
    expect(links.whatsapp).toContain("%F0%9F%92%9B");
    expect(links.whatsapp).not.toContain(" ");
    expect(decodeURIComponent(links.whatsapp.replace("https://wa.me/?text=", ""))).toBe(message);
  });
});

describe("demo plans", () => {
  it("swaps Secret Santa for January rent paid upfront and keeps the others", () => {
    const plans = demoPlans(TODAY);
    expect(plans.map((p) => p.label)).toEqual([
      "Winter ball",
      "Christmas meal",
      "January rent (12 weeks upfront)",
      "Ski trip deposit",
    ]);
    expect(plans[2]).toEqual({
      emoji: "🏠",
      label: "January rent (12 weeks upfront)",
      amountPence: 114000,
      date: "2027-01-01",
    });
  });

  it("January rent on Fri 20 Nov 2026 matches the exact reference", () => {
    const demo: RunwayInput = {
      today: TODAY,
      loanDate: demoLoanDate(TODAY),
      balancePence: DEMO_BALANCE_PENCE,
      overdraftPence: DEMO_OVERDRAFT_PENCE,
      dailySpendPence: DEMO_DAILY_SPEND_PENCE,
      bills: demoBills(TODAY),
    };
    const rent = demoPlans(TODAY).find((p) => p.label.startsWith("January rent"));
    if (!rent) throw new Error("missing January rent");
    const p = previewPlan(demo, rent);
    if (p === null) throw new Error("demo runway should be ok");
    expect([p.verdict, p.causesOverdraft]).toEqual(["exhausted", false]);
    expect([p.before.safeDailyPence, p.after.safeDailyPence]).toEqual([542, 0]);
    expect([p.after.firstOverdraftDate, p.after.firstExhaustedDate]).toEqual([
      "2027-01-01",
      "2027-01-01",
    ]);
    expect([p.before.endBalancePence, p.after.endBalancePence]).toEqual([-5600, -119600]);
    expect(isBigBill(p.plan)).toBe(true);
    expect(
      askParentMessage({
        name: "Mum",
        label: p.plan.label,
        amountPence: p.plan.amountPence,
        date: p.plan.date,
        loanDate: demo.loanDate,
        impact: impactPhrase(p),
      }),
    ).toBe(RENT_MESSAGE);
  });
});
