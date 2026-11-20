import { describe, expect, it } from "vitest";

import {
  ACCEPTANCE_BASE,
  ACCEPTANCE_DEMO_BASE,
  ACCEPTANCE_PLANS,
  ACCEPTANCE_SATURDAY_SHIFTS,
  ACCEPTANCE_TODAY,
  runRunwayAcceptance,
} from "./acceptance";
import { addDays, diffDays } from "./dates";
import {
  DEMO_BALANCE_PENCE,
  DEMO_DAILY_SPEND_PENCE,
  DEMO_OVERDRAFT_PENCE,
  demoBills,
  demoLoanDate,
  demoPlans,
} from "./fixture";
import referenceCases from "./reference-cases.json";
import { MAX_REPLY_LENGTH, planPhrase, replyFor } from "./reply";
import { computeRunway, countStatuses, isInWindow, MAX_RUNWAY_DAYS, previewPlan } from "./runway";
import type { Plan, PlanPreview, RunwayInput, RunwayOk, RunwayResult } from "./types";

// ---------- helpers ----------

function ok(r: RunwayResult): RunwayOk {
  if (!r.ok) throw new Error(`expected ok runway, got ${r.reason}: ${r.message}`);
  return r;
}

function base(patch: Partial<RunwayInput> = {}): RunwayInput {
  return { ...ACCEPTANCE_BASE, ...patch };
}

function mustPreview(input: RunwayInput, plan: Plan): PlanPreview {
  const p = previewPlan(input, plan);
  if (p === null) throw new Error("expected a preview");
  return p;
}

/** Timeline invariants that must hold for every ok runway. Returns the problems found. */
function timelineProblems(input: RunwayInput, r: RunwayOk): string[] {
  const problems: string[] = [];
  const { timeline } = r;
  if (timeline.length !== r.days) problems.push(`length ${timeline.length} != days ${r.days}`);
  if (r.days !== diffDays(input.loanDate, input.today)) problems.push("days != loan - today");
  let cumBills = 0;
  let cumIncome = 0;
  let firstOverdraft: string | null = null;
  let firstExhausted: string | null = null;
  timeline.forEach((cell, i) => {
    const expectedDate = addDays(input.today, i);
    if (cell.date !== expectedDate) problems.push(`day ${i}: date ${cell.date} != ${expectedDate}`);
    const dayBills = input.bills.filter((b) => b.date === cell.date);
    const dayTotal = dayBills.reduce((s, b) => s + b.amountPence, 0);
    if (cell.billsPence !== dayTotal) problems.push(`day ${i}: bills ${cell.billsPence}`);
    if (cell.billLabels.length !== dayBills.length) problems.push(`day ${i}: labels`);
    cumBills += dayTotal;
    cumIncome += (input.incomes ?? [])
      .filter((x) => x.date === cell.date)
      .reduce((s, x) => s + x.amountPence, 0);
    const end = input.balancePence - input.dailySpendPence * (i + 1) - cumBills + cumIncome;
    if (cell.endBalancePence !== end) problems.push(`day ${i}: end ${cell.endBalancePence}`);
    const status = end >= 0 ? "own" : end >= -input.overdraftPence ? "overdraft" : "exhausted";
    if (cell.status !== status) problems.push(`day ${i}: status ${cell.status} != ${status}`);
    if (end < 0 && firstOverdraft === null) firstOverdraft = cell.date;
    if (end < -input.overdraftPence && firstExhausted === null) firstExhausted = cell.date;
    if (!Number.isInteger(cell.endBalancePence)) problems.push(`day ${i}: non-integer`);
  });
  if (cumBills !== r.billsInWindowPence) problems.push("bills sum != billsInWindowPence");
  if (cumIncome !== r.incomeInWindowPence) problems.push("income sum != incomeInWindowPence");
  if (timeline.at(-1)?.endBalancePence !== r.endBalancePence) problems.push("last end mismatch");
  if (firstOverdraft !== r.firstOverdraftDate) problems.push("firstOverdraftDate mismatch");
  if (firstExhausted !== r.firstExhaustedDate) problems.push("firstExhaustedDate mismatch");
  return problems;
}

// ---------- (a) acceptance R1–R11 ----------

describe("runway acceptance cases (spec table)", () => {
  const plans = ACCEPTANCE_PLANS;

  it("R1 base demo", () => {
    const r = ok(computeRunway(base()));
    expect(r.days).toBe(59);
    expect(r.billsInWindowPence).toBe(6800);
    expect(r.safeDailyPence).toBe(562);
    expect(r.billsAloneOverdraftDate).toBeNull();
    expect(r.firstOverdraftDate).toBe("2027-01-10");
    expect(r.firstExhaustedDate).toBeNull();
    expect(r.endBalancePence).toBe(-5150);
    expect(r.daysEarly).toBe(8);
    expect(countStatuses(r.timeline)).toEqual({ own: 51, overdraft: 8, exhausted: 0 });
  });

  it("R2 + Winter ball £55 on 2026-12-04", () => {
    const p = mustPreview(base(), plans.winterBall);
    expect(p.verdict).toBe("overdraft");
    expect(p.causesOverdraft).toBe(false);
    expect([p.before.safeDailyPence, p.after.safeDailyPence]).toEqual([562, 469]);
    expect(p.safeDailyDeltaPence).toBe(-93);
    expect(p.before.firstOverdraftDate).toBe("2027-01-10");
    expect(p.after.firstOverdraftDate).toBe("2027-01-03");
    expect(p.daysEarlierOverdraft).toBe(7);
    expect([p.before.endBalancePence, p.after.endBalancePence]).toEqual([-5150, -10650]);
    expect(p.endBalanceDeltaPence).toBe(-5500);
  });

  it("R3 + Christmas meal £28 on 2026-12-10", () => {
    const p = mustPreview(base(), plans.christmasMeal);
    expect(p.verdict).toBe("overdraft");
    expect([p.before.safeDailyPence, p.after.safeDailyPence]).toEqual([562, 515]);
    expect(p.safeDailyDeltaPence).toBe(-47);
    expect(p.after.firstOverdraftDate).toBe("2027-01-05");
    expect(p.daysEarlierOverdraft).toBe(5);
    expect([p.before.endBalancePence, p.after.endBalancePence]).toEqual([-5150, -7950]);
  });

  it("R4 + Ski trip deposit £450 on 2026-12-12", () => {
    const p = mustPreview(base(), plans.skiTrip);
    expect(p.verdict).toBe("exhausted");
    expect(p.after.safeDailyPence).toBe(0);
    expect(p.after.firstOverdraftDate).toBe("2026-12-12");
    expect(p.daysEarlierOverdraft).toBe(29);
    expect(p.after.firstExhaustedDate).toBe("2027-01-17");
    expect(p.after.endBalancePence).toBe(-50150);
  });

  it("R5 + Gig £30 on 2027-01-20 (outside the window)", () => {
    const p = mustPreview(base(), plans.gig);
    expect(p.verdict).toBe("outside-window");
    expect(p.causesOverdraft).toBe(false);
    expect(p.safeDailyDeltaPence).toBe(0);
    expect(p.endBalanceDeltaPence).toBe(0);
    expect(p.daysEarlierOverdraft).toBe(0);
    expect(p.after.billsInWindowPence).toBe(p.before.billsInWindowPence);
  });

  it("R6 usual spend £5.62 never goes below £0", () => {
    const r = ok(computeRunway(base({ dailySpendPence: 562 })));
    expect(r.firstOverdraftDate).toBeNull();
    expect(r.daysEarly).toBeNull();
    expect(r.endBalancePence).toBe(42);
  });

  it("R7 usual spend £5.63 dips on the last day", () => {
    const r = ok(computeRunway(base({ dailySpendPence: 563 })));
    expect(r.firstOverdraftDate).toBe("2027-01-17");
    expect(r.endBalancePence).toBe(-17);
    expect(r.daysEarly).toBe(1);
  });

  it("R8 balance £50, spend £0: the bills alone go below £0", () => {
    const r = ok(computeRunway(base({ balancePence: 5000, dailySpendPence: 0 })));
    expect(r.safeDailyPence).toBe(0);
    expect(r.billsAloneOverdraftDate).toBe("2026-12-17");
    expect(r.firstOverdraftDate).toBe("2026-12-17");
    expect(r.endBalancePence).toBe(-1800);
  });

  it("R9 loan day = today", () => {
    const r = computeRunway(base({ loanDate: ACCEPTANCE_TODAY }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("loan-date-not-after-today");
      expect(r.message.length).toBeGreaterThan(0);
    }
    expect(previewPlan(base({ loanDate: ACCEPTANCE_TODAY }), plans.winterBall)).toBeNull();
  });

  it("R10 spend £4.00 + Winter ball is fine", () => {
    const p = mustPreview(base({ dailySpendPence: 400 }), plans.winterBall);
    expect(p.verdict).toBe("fine");
    expect(p.causesOverdraft).toBe(false);
    expect(p.daysEarlierOverdraft).toBeNull();
    expect([p.before.safeDailyPence, p.after.safeDailyPence]).toEqual([562, 469]);
    expect([p.before.endBalancePence, p.after.endBalancePence]).toEqual([9600, 4100]);
  });

  it("R11 spend £5.00 + Winter ball causes the overdraft", () => {
    const p = mustPreview(base({ dailySpendPence: 500 }), plans.winterBall);
    expect(p.verdict).toBe("overdraft");
    expect(p.causesOverdraft).toBe(true);
    expect(p.before.firstOverdraftDate).toBeNull();
    expect(p.after.firstOverdraftDate).toBe("2027-01-14");
    expect(p.daysEarlierOverdraft).toBeNull();
    expect([p.before.endBalancePence, p.after.endBalancePence]).toEqual([3700, -1800]);
  });

  it("R12 demo + £60 every Saturday: no overdraft, £424 to spare", () => {
    const r = ok(computeRunway({ ...ACCEPTANCE_DEMO_BASE, incomes: ACCEPTANCE_SATURDAY_SHIFTS }));
    expect(r.days).toBe(52);
    expect(r.incomeInWindowPence).toBe(48000);
    expect(r.safeDailyPence).toBe(1404);
    expect(r.firstOverdraftDate).toBeNull();
    expect(r.endBalancePence).toBe(42400);
  });

  it("R13 demo + £50 one-off on Tue 1 Dec", () => {
    const r = ok(
      computeRunway({
        ...ACCEPTANCE_DEMO_BASE,
        incomes: [{ id: "g", label: "Birthday money", amountPence: 5000, date: "2026-12-01" }],
      }),
    );
    expect(r.incomeInWindowPence).toBe(5000);
    expect(r.safeDailyPence).toBe(638);
    expect(r.firstOverdraftDate).toBe("2027-01-10");
    expect(r.endBalancePence).toBe(-600);
    expect(r.daysEarly).toBe(1);
  });

  it("R14 demo + £200 on loan day changes nothing", () => {
    const withLate = ok(
      computeRunway({
        ...ACCEPTANCE_DEMO_BASE,
        incomes: [{ id: "p", label: "Prize", amountPence: 20000, date: "2027-01-11" }],
      }),
    );
    const plain = ok(computeRunway(ACCEPTANCE_DEMO_BASE));
    expect(withLate.incomeInWindowPence).toBe(0);
    expect([
      withLate.safeDailyPence,
      withLate.firstOverdraftDate,
      withLate.endBalancePence,
    ]).toEqual([542, "2027-01-04", -5600]);
    expect(withLate.timeline).toEqual(plain.timeline);
  });

  it("runRunwayAcceptance reports R1–R14, all passing", () => {
    const rows = runRunwayAcceptance();
    expect(rows.map((r) => r.id)).toEqual([
      "R1",
      "R2",
      "R3",
      "R4",
      "R5",
      "R6",
      "R7",
      "R8",
      "R9",
      "R10",
      "R11",
      "R12",
      "R13",
      "R14",
    ]);
    for (const row of rows) {
      expect(row.actual, row.id).toBe(row.expected);
      expect(row.pass, row.id).toBe(true);
    }
  });

  it("the demo fixture on Fri 20 Nov 2026 gives the pitched numbers", () => {
    // The demo uses NTU's Term Two start (Mon 11 Jan 2027) and a £350 balance; the bills and
    // plans are the same as the acceptance base. Values checked against the exact reference.
    const strip = (bills: { label: string; amountPence: number; date: string }[]) =>
      bills.map(({ amountPence, date }) => ({ amountPence, date }));
    expect(demoLoanDate(ACCEPTANCE_TODAY)).toBe("2027-01-11");
    expect(DEMO_BALANCE_PENCE).toBe(35000);
    expect(DEMO_OVERDRAFT_PENCE).toBe(ACCEPTANCE_BASE.overdraftPence);
    expect(DEMO_DAILY_SPEND_PENCE).toBe(ACCEPTANCE_BASE.dailySpendPence);
    expect(strip(demoBills(ACCEPTANCE_TODAY))).toEqual(strip(ACCEPTANCE_BASE.bills));
    const demo: RunwayInput = {
      today: ACCEPTANCE_TODAY,
      loanDate: demoLoanDate(ACCEPTANCE_TODAY),
      balancePence: DEMO_BALANCE_PENCE,
      overdraftPence: DEMO_OVERDRAFT_PENCE,
      dailySpendPence: DEMO_DAILY_SPEND_PENCE,
      bills: demoBills(ACCEPTANCE_TODAY),
    };
    const base = computeRunway(demo);
    if (!base.ok) throw new Error("demo runway should be ok");
    expect([base.days, base.safeDailyPence, base.firstOverdraftDate, base.daysEarly]).toEqual([
      52,
      542,
      "2027-01-04",
      7,
    ]);
    const planFor = (label: string) => {
      const p = demoPlans(ACCEPTANCE_TODAY).find((d) => d.label === label);
      if (!p) throw new Error(`missing demo plan ${label}`);
      return { label: p.label, amountPence: p.amountPence, date: p.date };
    };
    const ball = previewPlan(demo, planFor("Winter ball"));
    expect(ball && [ball.verdict, ball.daysEarlierOverdraft, ball.after.safeDailyPence]).toEqual([
      "overdraft",
      8,
      436,
    ]);
    expect(ball?.after.firstOverdraftDate).toBe("2026-12-27");
    expect(ball?.after.endBalancePence).toBe(-11100);
    const ski = previewPlan(demo, planFor("Ski trip deposit"));
    expect(ski && [ski.verdict, ski.after.firstExhaustedDate]).toEqual(["exhausted", "2027-01-10"]);
    const deposit = previewPlan(demo, {
      label: "Holding deposit",
      amountPence: 9500,
      date: "2026-11-27",
    });
    expect(deposit && [deposit.daysEarlierOverdraft, deposit.after.safeDailyPence]).toEqual([
      14, 359,
    ]);
  });
});

// ---------- (b) differential test against the exact Python reference ----------

interface RefRunwayOk {
  ok: true;
  days: number;
  billsInWindowPence: number;
  incomeInWindowPence: number;
  safeDailyPence: number;
  billsAloneOverdraftDate: string | null;
  firstOverdraftDate: string | null;
  firstExhaustedDate: string | null;
  endBalancePence: number;
  daysEarly: number | null;
  statusCounts: { own: number; overdraft: number; exhausted: number };
}
interface RefRunwayErr {
  ok: false;
  reason: string;
}
type RefRunway = RefRunwayOk | RefRunwayErr;
interface RefPreview {
  verdict: string;
  causesOverdraft: boolean;
  safeDailyDeltaPence: number;
  endBalanceDeltaPence: number;
  daysEarlierOverdraft: number | null;
  before: RefRunwayOk;
  after: RefRunwayOk;
}
interface ReferenceCase {
  input: RunwayInput & { plan?: Plan };
  expected: RefRunway | RefPreview | { before: RefRunwayErr };
}

const RUNWAY_FIELDS = [
  "days",
  "billsInWindowPence",
  "incomeInWindowPence",
  "safeDailyPence",
  "billsAloneOverdraftDate",
  "firstOverdraftDate",
  "firstExhaustedDate",
  "endBalancePence",
  "daysEarly",
] as const;

function compareRunway(tag: string, actual: RunwayResult, expected: RefRunway, out: string[]) {
  if (actual.ok !== expected.ok) {
    out.push(`${tag}: ok ${actual.ok} vs ${expected.ok}`);
    return;
  }
  if (!actual.ok || !expected.ok) {
    if (!actual.ok && !expected.ok && actual.reason !== expected.reason)
      out.push(`${tag}: reason ${actual.reason} vs ${expected.reason}`);
    return;
  }
  for (const field of RUNWAY_FIELDS) {
    if (actual[field] !== expected[field])
      out.push(`${tag}.${field}: ${String(actual[field])} vs ${String(expected[field])}`);
  }
  const counts = countStatuses(actual.timeline);
  if (JSON.stringify(counts) !== JSON.stringify(expected.statusCounts))
    out.push(
      `${tag}.statusCounts: ${JSON.stringify(counts)} vs ${JSON.stringify(expected.statusCounts)}`,
    );
}

describe("runway matches the exact Python reference", () => {
  const cases = referenceCases as unknown as ReferenceCase[];

  it("has the full reference set (runways, previews and errors)", () => {
    expect(cases).toHaveLength(220);
    expect(cases.filter((c) => c.input.plan).length).toBeGreaterThan(0);
    expect(cases.filter((c) => !c.input.plan).length).toBeGreaterThan(0);
    // ~40% carry expected income, including some dated outside the window.
    const withIncome = cases.filter((c) => (c.input.incomes ?? []).length > 0);
    expect(withIncome.length).toBeGreaterThan(50);
    expect(
      withIncome.some((c) => (c.input.incomes ?? []).some((i) => !isInWindow(c.input, i.date))),
    ).toBe(true);
  });

  it(`agrees on every field of all ${cases.length} cases`, () => {
    const mismatches: string[] = [];
    cases.forEach((c, idx) => {
      const { plan, ...rest } = c.input;
      const input: RunwayInput = rest;
      if (plan === undefined) {
        compareRunway(`#${idx}`, computeRunway(input), c.expected as RefRunway, mismatches);
        return;
      }
      const e = c.expected as RefPreview | { before: RefRunwayErr };
      const p = previewPlan(input, plan);
      if (!e.before.ok) {
        if (p !== null) mismatches.push(`#${idx}: expected null preview`);
        compareRunway(`#${idx}.base`, computeRunway(input), e.before, mismatches);
        return;
      }
      const ep = e as RefPreview;
      if (p === null) {
        mismatches.push(`#${idx}: preview was null`);
        return;
      }
      if (p.verdict !== ep.verdict)
        mismatches.push(`#${idx}.verdict: ${p.verdict} vs ${ep.verdict}`);
      if (p.causesOverdraft !== ep.causesOverdraft) mismatches.push(`#${idx}.causesOverdraft`);
      if (p.safeDailyDeltaPence !== ep.safeDailyDeltaPence)
        mismatches.push(
          `#${idx}.safeDailyDelta: ${p.safeDailyDeltaPence} vs ${ep.safeDailyDeltaPence}`,
        );
      if (p.endBalanceDeltaPence !== ep.endBalanceDeltaPence)
        mismatches.push(
          `#${idx}.endDelta: ${p.endBalanceDeltaPence} vs ${ep.endBalanceDeltaPence}`,
        );
      if (p.daysEarlierOverdraft !== ep.daysEarlierOverdraft)
        mismatches.push(
          `#${idx}.daysEarlier: ${String(p.daysEarlierOverdraft)} vs ${String(ep.daysEarlierOverdraft)}`,
        );
      compareRunway(`#${idx}.before`, p.before, ep.before, mismatches);
      compareRunway(`#${idx}.after`, p.after, ep.after, mismatches);
      if (JSON.stringify(p.plan) !== JSON.stringify(plan)) mismatches.push(`#${idx}.plan`);
    });
    expect(mismatches).toEqual([]);
  });
});

// ---------- (c) timeline sanity ----------

describe("timeline sanity", () => {
  const cases = referenceCases as unknown as ReferenceCase[];

  it("holds for the acceptance input and every ok reference runway", () => {
    const problems: string[] = [];
    const inputs: RunwayInput[] = [base(), base({ dailySpendPence: 0 })];
    for (const c of cases) {
      const { plan, ...input } = c.input;
      inputs.push(input);
      if (plan) inputs.push({ ...input, bills: [...input.bills, { id: "p", ...plan }] });
    }
    inputs.forEach((input, idx) => {
      const r = computeRunway(input);
      if (!r.ok) return;
      for (const p of timelineProblems(input, r)) problems.push(`input ${idx}: ${p}`);
    });
    expect(problems).toEqual([]);
  });

  it("keeps dates consecutive across a leap day, a year end and the clocks changing", () => {
    for (const [today, loanDate] of [
      ["2028-02-20", "2028-03-05"], // 29 Feb 2028
      ["2026-12-25", "2027-01-08"], // new year
      ["2027-03-20", "2027-04-05"], // BST starts 28 Mar 2027
      ["2026-10-20", "2026-11-05"], // BST ends 25 Oct 2026
    ] as const) {
      const input = base({ today, loanDate, bills: [] });
      const r = ok(computeRunway(input));
      expect(timelineProblems(input, r)).toEqual([]);
    }
    const leap = ok(
      computeRunway(base({ today: "2028-02-28", loanDate: "2028-03-02", bills: [] })),
    );
    expect(leap.timeline.map((c) => c.date)).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  });

  it("puts bill labels on their day, in input order, and ignores bills outside the window", () => {
    const input = base({
      bills: [
        { id: "a", label: "Rent", amountPence: 100, date: "2026-11-21" },
        { id: "b", label: "Gym", amountPence: 50, date: "2026-11-21" },
        { id: "c", label: "Old", amountPence: 999, date: "2026-11-19" },
        { id: "d", label: "Later", amountPence: 999, date: "2027-01-18" },
        { id: "e", label: "Today", amountPence: 10, date: "2026-11-20" },
      ],
    });
    const r = ok(computeRunway(input));
    expect(r.billsInWindowPence).toBe(160);
    expect(r.timeline[0]).toMatchObject({ billsPence: 10, billLabels: ["Today"] });
    expect(r.timeline[1]).toMatchObject({ billsPence: 150, billLabels: ["Rent", "Gym"] });
    expect(r.timeline.at(-1)?.billLabels).toEqual([]);
  });
});

// ---------- safe daily spend, by property ----------

describe("safe daily spend", () => {
  const cases = referenceCases as unknown as ReferenceCase[];

  it("never dips below £0 at the safe amount, and does at 1p more", () => {
    let checked = 0;
    for (const c of cases) {
      const { plan, ...input } = c.input;
      const r = computeRunway(input);
      if (!r.ok || r.billsAloneOverdraftDate !== null) continue;
      const atSafe = ok(computeRunway({ ...input, dailySpendPence: r.safeDailyPence }));
      expect(atSafe.firstOverdraftDate).toBeNull();
      const over = ok(computeRunway({ ...input, dailySpendPence: r.safeDailyPence + 1 }));
      expect(over.firstOverdraftDate).not.toBeNull();
      checked += 1;
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("does not depend on the usual daily spend", () => {
    const a = ok(computeRunway(base({ dailySpendPence: 0 })));
    const b = ok(computeRunway(base({ dailySpendPence: 12345 })));
    expect(a.safeDailyPence).toBe(b.safeDailyPence);
  });
});

// ---------- input validation ----------

describe("input validation", () => {
  const invalidCases: [string, Partial<RunwayInput>][] = [
    ["non-integer balance", { balancePence: 400.5 }],
    ["negative balance", { balancePence: -1 }],
    ["NaN balance", { balancePence: Number.NaN }],
    ["infinite balance", { balancePence: Number.POSITIVE_INFINITY }],
    ["string balance", { balancePence: "400" as unknown as number }],
    ["negative overdraft", { overdraftPence: -50000 }],
    ["non-integer overdraft", { overdraftPence: 0.1 }],
    ["negative daily spend", { dailySpendPence: -650 }],
    ["non-integer daily spend", { dailySpendPence: 6.5 }],
    ["huge daily spend", { dailySpendPence: 1e15 }],
    ["impossible today", { today: "2026-02-30" }],
    ["bad month", { today: "2026-13-01" }],
    ["UK-format date", { today: "20/11/2026" }],
    ["empty loan date", { loanDate: "" }],
    ["loan date with time", { loanDate: "2027-01-18T00:00:00Z" }],
    ["bills not a list", { bills: null as unknown as RunwayInput["bills"] }],
    [
      "negative bill",
      { bills: [{ id: "x", label: "Refund", amountPence: -100, date: "2026-12-01" }] },
    ],
    [
      "fractional bill",
      { bills: [{ id: "x", label: "Phone", amountPence: 15.5, date: "2026-12-01" }] },
    ],
    [
      "bill with a bad date (even outside the window)",
      { bills: [{ id: "x", label: "Phone", amountPence: 100, date: "2030-02-31" }] },
    ],
    ["loan day too far away", { loanDate: addDays(ACCEPTANCE_TODAY, MAX_RUNWAY_DAYS + 1) }],
    ["incomes not a list", { incomes: "lots" as unknown as NonNullable<RunwayInput["incomes"]> }],
    [
      "negative income",
      { incomes: [{ id: "i", label: "Shift", amountPence: -6000, date: "2026-11-21" }] },
    ],
    [
      "fractional income",
      { incomes: [{ id: "i", label: "Shift", amountPence: 60.5, date: "2026-11-21" }] },
    ],
    [
      "income with a bad date",
      { incomes: [{ id: "i", label: "Shift", amountPence: 6000, date: "2026-11-31" }] },
    ],
  ];

  for (const [name, patch] of invalidCases) {
    it(`rejects ${name}`, () => {
      const r = computeRunway(base(patch));
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reason).toBe("invalid-input");
        expect(r.message.length).toBeGreaterThan(0);
      }
      expect(previewPlan(base(patch), ACCEPTANCE_PLANS.winterBall)).toBeNull();
    });
  }

  it("accepts zero money everywhere and the longest allowed runway", () => {
    expect(computeRunway(base({ balancePence: 0, overdraftPence: 0, dailySpendPence: 0 })).ok).toBe(
      true,
    );
    const r = ok(computeRunway(base({ loanDate: addDays(ACCEPTANCE_TODAY, MAX_RUNWAY_DAYS) })));
    expect(r.days).toBe(MAX_RUNWAY_DAYS);
  });

  it("returns loan-date-not-after-today when loan day has passed", () => {
    const r = computeRunway(base({ loanDate: "2026-11-01" }));
    expect(r).toMatchObject({ ok: false, reason: "loan-date-not-after-today" });
  });

  it("returns null for an invalid plan", () => {
    const bad: Plan[] = [
      { label: "Ball", amountPence: -5500, date: "2026-12-04" },
      { label: "Ball", amountPence: 55.5, date: "2026-12-04" },
      { label: "Ball", amountPence: 5500, date: "2026-12-32" },
    ];
    for (const plan of bad) expect(previewPlan(base(), plan)).toBeNull();
  });
});

// ---------- expected income ----------

describe("expected income", () => {
  const shift = (date: string, amountPence = 6000) => ({
    id: `s-${date}`,
    label: "Shift",
    amountPence,
    date,
  });

  it("arrives at the end of its day and lifts every later day", () => {
    const plain = ok(computeRunway(base()));
    const r = ok(computeRunway(base({ incomes: [shift("2026-11-22")] })));
    expect(r.timeline[1]?.endBalancePence).toBe(plain.timeline[1]?.endBalancePence);
    expect(r.timeline[2]?.endBalancePence).toBe((plain.timeline[2]?.endBalancePence ?? 0) + 6000);
    expect(r.endBalancePence).toBe(plain.endBalancePence + 6000);
    expect(r.billsInWindowPence).toBe(plain.billsInWindowPence);
  });

  it("only counts from today up to the day before loan day", () => {
    const r = ok(
      computeRunway(
        base({
          incomes: [shift("2026-11-19"), shift("2026-11-20", 100), shift("2027-01-17", 200)],
        }),
      ),
    );
    expect(r.incomeInWindowPence).toBe(300);
    expect(ok(computeRunway(base({ incomes: [shift("2027-01-18")] }))).incomeInWindowPence).toBe(0);
  });

  it("income late in the window cannot rescue an early dip in the safe amount", () => {
    // Safe spend is limited by the tightest day: money arriving on the last day can't pay for day 1.
    const tight = base({ balancePence: 100, dailySpendPence: 0, bills: [] });
    // £1 over the 58 days before the money lands: 1p a day.
    const r = ok(computeRunway({ ...tight, incomes: [shift("2027-01-17", 100000)] }));
    expect(r.safeDailyPence).toBe(1);
    // The same money tonight: £1,001 over 59 days.
    const early = ok(computeRunway({ ...tight, incomes: [shift("2026-11-20", 100000)] }));
    expect(early.safeDailyPence).toBe(1696);
  });

  it("income can cover a bill on the same day", () => {
    const input = base({
      balancePence: 0,
      dailySpendPence: 0,
      bills: [{ id: "b", label: "Phone", amountPence: 1500, date: "2026-12-05" }],
      incomes: [shift("2026-12-05", 1500)],
    });
    const r = ok(computeRunway(input));
    expect(r.billsAloneOverdraftDate).toBeNull();
    expect(r.firstOverdraftDate).toBeNull();
    expect(r.endBalancePence).toBe(0);
  });

  it("an empty or missing incomes list is the same as no income", () => {
    const plain = ok(computeRunway(base()));
    const empty = ok(computeRunway(base({ incomes: [] })));
    expect(empty).toEqual(plain);
    expect(plain.incomeInWindowPence).toBe(0);
  });

  it("previewPlan keeps the incomes on both sides", () => {
    const p = mustPreview(
      { ...ACCEPTANCE_DEMO_BASE, incomes: ACCEPTANCE_SATURDAY_SHIFTS },
      ACCEPTANCE_PLANS.winterBall,
    );
    expect(p.before.incomeInWindowPence).toBe(48000);
    expect(p.after.incomeInWindowPence).toBe(48000);
    expect(p.endBalanceDeltaPence).toBe(-5500);
  });
});

// ---------- previewPlan details ----------

describe("previewPlan", () => {
  it("does not change the input", () => {
    const input = base();
    const snapshot = JSON.stringify(input);
    previewPlan(input, ACCEPTANCE_PLANS.winterBall);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("treats a plan before today as outside the window", () => {
    const p = mustPreview(base(), { label: "Gig", amountPence: 3000, date: "2026-11-19" });
    expect(p.verdict).toBe("outside-window");
    expect(p.endBalanceDeltaPence).toBe(0);
  });

  it("counts a plan today and on the last spending day, but not on loan day", () => {
    const plan = (date: string): Plan => ({ label: "Pizza", amountPence: 1200, date });
    expect(mustPreview(base(), plan("2026-11-20")).endBalanceDeltaPence).toBe(-1200);
    expect(mustPreview(base(), plan("2027-01-17")).endBalanceDeltaPence).toBe(-1200);
    expect(mustPreview(base(), plan("2027-01-18")).verdict).toBe("outside-window");
  });

  it("returns a clean copy of the plan (no extra fields such as an emoji)", () => {
    const demo = demoPlans(ACCEPTANCE_TODAY)[0];
    if (!demo) throw new Error("no demo plan");
    const p = mustPreview(base(), demo);
    expect(p.plan).toEqual({ label: demo.label, amountPence: demo.amountPence, date: demo.date });
  });

  it("isInWindow follows today <= date < loan day", () => {
    expect(isInWindow(base(), "2026-11-19")).toBe(false);
    expect(isInWindow(base(), "2026-11-20")).toBe(true);
    expect(isInWindow(base(), "2027-01-17")).toBe(true);
    expect(isInWindow(base(), "2027-01-18")).toBe(false);
    expect(isInWindow(base(), "not a date")).toBe(false);
  });
});

// ---------- group-chat replies ----------

describe("replyFor", () => {
  const plans = ACCEPTANCE_PLANS;
  const emojiCount = (s: string) => (s.match(/\p{Extended_Pictographic}/gu) ?? []).length;

  function expectChatSized(reply: string) {
    expect(reply.trim().length).toBeGreaterThan(0);
    expect(Array.from(reply).length).toBeLessThan(MAX_REPLY_LENGTH);
    expect(emojiCount(reply)).toBeLessThanOrEqual(1);
  }

  const fine = mustPreview(base({ dailySpendPence: 400 }), plans.winterBall);
  const causes = mustPreview(base({ dailySpendPence: 500 }), plans.winterBall);
  const deeper = mustPreview(base(), plans.winterBall);
  const exhausted = mustPreview(base(), plans.skiTrip);
  const outside = mustPreview(base(), plans.gig);

  it("fine: an enthusiastic yes naming the plan", () => {
    const reply = replyFor(fine);
    expectChatSized(reply);
    expect(reply).toMatch(/^Yes/);
    expect(reply).toContain("the winter ball");
  });

  it("overdraft it causes: a polite no that saves till January and offers something cheaper", () => {
    const reply = replyFor(causes);
    expectChatSized(reply);
    expect(reply).toContain("the winter ball");
    expect(reply).toContain("overdraft before January");
    expect(reply).toMatch(/instead/i);
  });

  it("already in the overdraft: money's tight till loan day", () => {
    const reply = replyFor(deeper);
    expectChatSized(reply);
    expect(reply).toContain("Money's tight till loan day");
    expect(reply).toContain("the winter ball");
  });

  it("exhausted: a firm but warm no", () => {
    const social = replyFor({ ...exhausted, plan: plans.winterBall });
    expectChatSized(social);
    expect(social).toMatch(/no from me/i);
    expect(social).toContain("the winter ball");
    // A deposit is something you pay, so the reply asks to pay later instead.
    const deposit = replyFor(exhausted);
    expectChatSized(deposit);
    expect(deposit).toContain("the ski trip deposit");
    expect(deposit).toMatch(/can't cover/i);
  });

  it("outside the window: after loan day, count me in", () => {
    const reply = replyFor(outside);
    expectChatSized(reply);
    expect(reply).toMatch(/after loan day/i);
    expect(reply).toMatch(/count me in/i);
    expect(reply).toContain("the gig");
  });

  it("stays chat-sized for every verdict, plan type and a very long plan name", () => {
    const longLabel = "Massive end of term celebration bottomless brunch and karaoke night out";
    for (const p of [fine, causes, deeper, exhausted, outside]) {
      for (const label of ["Winter ball", "Holding deposit", longLabel]) {
        expectChatSized(replyFor({ ...p, plan: { ...p.plan, label } }));
      }
    }
    expect(replyFor({ ...causes, plan: { ...causes.plan, label: longLabel } })).toContain("this");
  });

  it("uses the plan name in lower case where natural", () => {
    expect(planPhrase("Winter ball")).toBe("the winter ball");
    expect(planPhrase("Christmas meal")).toBe("the Christmas meal");
    expect(planPhrase("Secret Santa")).toBe("the secret Santa");
    expect(planPhrase("Sophie's birthday")).toBe("Sophie's birthday");
    expect(planPhrase("My mate's gig")).toBe("my mate's gig");
    expect(planPhrase("KFC run")).toBe("the KFC run");
    expect(planPhrase("  ")).toBe("this");
  });
});
