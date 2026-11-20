import { describe, expect, it } from "vitest";

import { pounds } from "@/lib/dibs/format";
import { addDays } from "@/lib/money/dates";
import {
  DEMO_BALANCE_PENCE,
  DEMO_DAILY_SPEND_PENCE,
  DEMO_OVERDRAFT_PENCE,
  demoBills,
  demoLoanDate,
} from "@/lib/money/fixture";
import { computeRunway, previewPlan } from "@/lib/money/runway";
import type { Plan, PlanPreview, RunwayInput, RunwayOk } from "@/lib/money/types";

import { tipFor, tipsFor } from "./tips";

const TODAY = "2026-11-20";

function demoInput(patch: Partial<RunwayInput> = {}): RunwayInput {
  return {
    today: TODAY,
    loanDate: demoLoanDate(TODAY),
    balancePence: DEMO_BALANCE_PENCE,
    overdraftPence: DEMO_OVERDRAFT_PENCE,
    dailySpendPence: DEMO_DAILY_SPEND_PENCE,
    bills: demoBills(TODAY),
    ...patch,
  };
}

function runway(input: RunwayInput): RunwayOk {
  const r = computeRunway(input);
  if (!r.ok) throw new Error(r.message);
  return r;
}

function preview(input: RunwayInput, plan: Plan): PlanPreview {
  const p = previewPlan(input, plan);
  if (p === null) throw new Error("no preview");
  return p;
}

function tip(input: RunwayInput, plan?: Plan) {
  return tipFor({
    result: runway(input),
    dailySpendPence: input.dailySpendPence,
    overdraftPence: input.overdraftPence,
    preview: plan ? preview(input, plan) : null,
  });
}

const winterBall: Plan = { label: "Winter ball", amountPence: 5500, date: addDays(TODAY, 14) };
const skiTrip: Plan = { label: "Ski trip deposit", amountPence: 45000, date: addDays(TODAY, 22) };

describe("tipFor without a preview", () => {
  it("demo numbers: safe £5.42, usual £6.50, so cut £1.08 a day", () => {
    const input = demoInput();
    const r = runway(input);
    expect(r.safeDailyPence).toBe(542);
    expect(r.firstOverdraftDate).not.toBeNull();
    expect(tip(input)).toEqual({
      mood: "chill",
      text: "Spend £1.08 less a day and you'll make it to loan day without touching your overdraft.",
    });
  });

  it("the cut really works: spending the safe amount never dips below £0", () => {
    const r = runway(demoInput({ dailySpendPence: 542 }));
    expect(r.firstOverdraftDate).toBeNull();
  });

  it("on track: party, with the exact amount to spare", () => {
    const input = demoInput({ dailySpendPence: 500 });
    const r = runway(input);
    expect(r.firstOverdraftDate).toBeNull();
    expect(tip(input)).toEqual({
      mood: "party",
      text: `You're on track for loan day with ${pounds(r.endBalancePence)} to spare. Main character energy ✨`,
    });
  });

  it("bills alone sink you: worried, with the date", () => {
    const input = demoInput({ balancePence: 5000, dailySpendPence: 0 });
    const r = runway(input);
    expect(r.billsAloneOverdraftDate).toBe(addDays(TODAY, 27));
    expect(tip(input)).toEqual({
      mood: "worried",
      text: "Your bills alone sink you on Thu 17 Dec. Time to move a bill or ask for backup.",
    });
  });

  it("uses the exhausted mood when the overdraft runs out", () => {
    const input = demoInput({ dailySpendPence: 1800 });
    expect(runway(input).firstExhaustedDate).not.toBeNull();
    expect(tip(input).mood).toBe("worried");
    expect(tip(input).text).toMatch(/^Spend £\d+\.\d\d less a day/);
  });
});

describe("tipFor with a preview", () => {
  it("overdraft sooner: says how many more days skipping keeps it untouched", () => {
    const input = demoInput();
    const p = preview(input, winterBall);
    expect(p.verdict).toBe("overdraft");
    const n = p.daysEarlierOverdraft;
    expect(n).not.toBeNull();
    expect(n).toBeGreaterThan(0);
    expect(tip(input, winterBall)).toEqual({
      mood: "worried",
      text: `Skipping this keeps your overdraft untouched for ${n} more days.`,
    });
  });

  it("exhausted", () => {
    expect(tip(demoInput(), skiTrip)).toEqual({
      mood: "worried",
      text: "That would wipe out your whole overdraft. Skip it or ask for help? 👀",
    });
  });

  it("fine", () => {
    const input = demoInput({ dailySpendPence: 300 });
    expect(preview(input, winterBall).verdict).toBe("fine");
    expect(tip(input, winterBall)).toEqual({
      mood: "happy",
      text: "You can afford it AND reach loan day. Go have fun 🎉",
    });
  });

  it("causes the first overdraft: names the date instead of 'deeper'", () => {
    const input = demoInput({ dailySpendPence: 500 });
    const p = preview(input, winterBall);
    expect(p.causesOverdraft).toBe(true);
    expect(p.after.firstOverdraftDate).not.toBeNull();
    expect(tip(input, winterBall).text).toMatch(/^This would tip you into your overdraft on /);
  });

  it("outside the window", () => {
    const later: Plan = { label: "Gig", amountPence: 3000, date: addDays(demoLoanDate(TODAY), 2) };
    expect(tip(demoInput(), later).mood).toBe("chill");
  });
});

describe("tipsFor", () => {
  it("leads with tipFor and adds evergreen tips", () => {
    const input = demoInput();
    const all = tipsFor({
      result: runway(input),
      dailySpendPence: input.dailySpendPence,
      overdraftPence: input.overdraftPence,
    });
    expect(all[0]).toEqual(tip(input));
    expect(all.length).toBeGreaterThan(2);
    expect(all[1]?.text).toContain("£5.42 a day");
  });
});
