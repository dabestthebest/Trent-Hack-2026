// Acceptance cases for the Til Loan Day runway engine (R1–R14). Expected values come from the build
// spec, which was pinned by the exact Python reference. Used by the /selftest page and the unit tests.
// Inputs are fixed literal dates (today = Fri 20 Nov 2026) so the checks read the same on any day.

import type { AcceptanceRow } from "../dibs/acceptance";
import { countStatuses, computeRunway, previewPlan } from "./runway";
import type { Income, Plan, PlanPreview, RunwayInput, RunwayResult } from "./types";

export const ACCEPTANCE_TODAY = "2026-11-20";

/** The demo on Fri 20 Nov 2026: £400, £500 overdraft, £6.50 a day, three bills, loan Mon 18 Jan. */
export const ACCEPTANCE_BASE: RunwayInput = {
  today: ACCEPTANCE_TODAY,
  loanDate: "2027-01-18",
  balancePence: 40000,
  overdraftPence: 50000,
  dailySpendPence: 650,
  bills: [
    { id: "phone-dec", label: "Phone bill", amountPence: 1500, date: "2026-12-05" },
    { id: "train-home", label: "Train home", amountPence: 3800, date: "2026-12-17" },
    { id: "phone-jan", label: "Phone bill", amountPence: 1500, date: "2027-01-05" },
  ],
};

/** The live demo on Fri 20 Nov 2026 (NTU Term Two start, £350): the base for the income cases R12–R14. */
export const ACCEPTANCE_DEMO_BASE: RunwayInput = {
  ...ACCEPTANCE_BASE,
  loanDate: "2027-01-11",
  balancePence: 35000,
};

/** £60 every Saturday before loan day (Sat 21 Nov … Sat 9 Jan): eight shifts, £480. */
export const ACCEPTANCE_SATURDAY_SHIFTS: Income[] = [
  "2026-11-21",
  "2026-11-28",
  "2026-12-05",
  "2026-12-12",
  "2026-12-19",
  "2026-12-26",
  "2027-01-02",
  "2027-01-09",
].map((date) => ({ id: `shift@${date}`, label: "Saturday shift", amountPence: 6000, date }));

export const ACCEPTANCE_PLANS = {
  winterBall: { label: "Winter ball", amountPence: 5500, date: "2026-12-04" },
  christmasMeal: { label: "Christmas meal", amountPence: 2800, date: "2026-12-10" },
  skiTrip: { label: "Ski trip deposit", amountPence: 45000, date: "2026-12-12" },
  gig: { label: "Gig", amountPence: 3000, date: "2027-01-20" },
} satisfies Record<string, Plan>;

type Summary = Record<string, unknown>;

interface RunwayAcceptanceCase {
  id: string;
  description: string;
  expected: Summary;
  run: () => Summary;
}

function withInput(patch: Partial<RunwayInput>): RunwayInput {
  return { ...ACCEPTANCE_BASE, ...patch };
}

/** Every checkable field of a runway result, by its contract name. */
export function summariseRunway(r: RunwayResult): Summary {
  if (!r.ok) return { ok: false, reason: r.reason };
  return {
    ok: true,
    days: r.days,
    billsInWindowPence: r.billsInWindowPence,
    incomeInWindowPence: r.incomeInWindowPence,
    safeDailyPence: r.safeDailyPence,
    billsAloneOverdraftDate: r.billsAloneOverdraftDate,
    firstOverdraftDate: r.firstOverdraftDate,
    firstExhaustedDate: r.firstExhaustedDate,
    endBalancePence: r.endBalancePence,
    daysEarly: r.daysEarly,
    statusCounts: countStatuses(r.timeline),
  };
}

/** Every checkable field of a preview. Before/after pairs are [before, after]. */
export function summarisePreview(p: PlanPreview | null): Summary {
  if (p === null) return { preview: null };
  return {
    verdict: p.verdict,
    causesOverdraft: p.causesOverdraft,
    safeDailyPence: [p.before.safeDailyPence, p.after.safeDailyPence],
    safeDailyDeltaPence: p.safeDailyDeltaPence,
    firstOverdraftDate: [p.before.firstOverdraftDate, p.after.firstOverdraftDate],
    daysEarlierOverdraft: p.daysEarlierOverdraft,
    firstExhaustedDate: [p.before.firstExhaustedDate, p.after.firstExhaustedDate],
    endBalancePence: [p.before.endBalancePence, p.after.endBalancePence],
    endBalanceDeltaPence: p.endBalanceDeltaPence,
  };
}

const runway =
  (patch: Partial<RunwayInput> = {}) =>
  () =>
    summariseRunway(computeRunway(withInput(patch)));
const preview =
  (plan: Plan, patch: Partial<RunwayInput> = {}) =>
  () =>
    summarisePreview(previewPlan(withInput(patch), plan));

export const RUNWAY_ACCEPTANCE_CASES: RunwayAcceptanceCase[] = [
  {
    id: "R1",
    description: "Base demo: £400, £6.50 a day, three bills",
    expected: {
      days: 59,
      billsInWindowPence: 6800,
      safeDailyPence: 562,
      firstOverdraftDate: "2027-01-10",
      firstExhaustedDate: null,
      endBalancePence: -5150,
      daysEarly: 8,
      statusCounts: { own: 51, overdraft: 8, exhausted: 0 },
    },
    run: runway(),
  },
  {
    id: "R2",
    description: "+ Winter ball £55 on Fri 4 Dec",
    expected: {
      verdict: "overdraft",
      causesOverdraft: false,
      safeDailyPence: [562, 469],
      safeDailyDeltaPence: -93,
      firstOverdraftDate: ["2027-01-10", "2027-01-03"],
      daysEarlierOverdraft: 7,
      endBalancePence: [-5150, -10650],
    },
    run: preview(ACCEPTANCE_PLANS.winterBall),
  },
  {
    id: "R3",
    description: "+ Christmas meal £28 on Thu 10 Dec",
    expected: {
      verdict: "overdraft",
      causesOverdraft: false,
      safeDailyPence: [562, 515],
      safeDailyDeltaPence: -47,
      firstOverdraftDate: ["2027-01-10", "2027-01-05"],
      daysEarlierOverdraft: 5,
      endBalancePence: [-5150, -7950],
    },
    run: preview(ACCEPTANCE_PLANS.christmasMeal),
  },
  {
    id: "R4",
    description: "+ Ski trip deposit £450 on Sat 12 Dec",
    expected: {
      verdict: "exhausted",
      safeDailyPence: [562, 0],
      firstOverdraftDate: ["2027-01-10", "2026-12-12"],
      daysEarlierOverdraft: 29,
      firstExhaustedDate: [null, "2027-01-17"],
      endBalancePence: [-5150, -50150],
    },
    run: preview(ACCEPTANCE_PLANS.skiTrip),
  },
  {
    id: "R5",
    description: "+ Gig £30 on Wed 20 Jan (after loan day)",
    expected: {
      verdict: "outside-window",
      causesOverdraft: false,
      safeDailyDeltaPence: 0,
      endBalanceDeltaPence: 0,
      daysEarlierOverdraft: 0,
    },
    run: preview(ACCEPTANCE_PLANS.gig),
  },
  {
    id: "R6",
    description: "Usual spend £5.62: the safe amount really is safe",
    expected: { safeDailyPence: 562, firstOverdraftDate: null, endBalancePence: 42 },
    run: runway({ dailySpendPence: 562 }),
  },
  {
    id: "R7",
    description: "Usual spend £5.63: 1p over safe",
    expected: { firstOverdraftDate: "2027-01-17", endBalancePence: -17, daysEarly: 1 },
    run: runway({ dailySpendPence: 563 }),
  },
  {
    id: "R8",
    description: "Balance £50, spend £0: bills alone go below £0",
    expected: {
      safeDailyPence: 0,
      billsAloneOverdraftDate: "2026-12-17",
      firstOverdraftDate: "2026-12-17",
      endBalancePence: -1800,
    },
    run: runway({ balancePence: 5000, dailySpendPence: 0 }),
  },
  {
    id: "R9",
    description: "Loan day is today",
    expected: { ok: false, reason: "loan-date-not-after-today" },
    run: runway({ loanDate: ACCEPTANCE_TODAY }),
  },
  {
    id: "R10",
    description: "Spend £4.00 + Winter ball: still fine",
    expected: {
      verdict: "fine",
      safeDailyPence: [562, 469],
      endBalancePence: [9600, 4100],
    },
    run: preview(ACCEPTANCE_PLANS.winterBall, { dailySpendPence: 400 }),
  },
  {
    id: "R11",
    description: "Spend £5.00 + Winter ball: tips you into your overdraft",
    expected: {
      verdict: "overdraft",
      causesOverdraft: true,
      firstOverdraftDate: [null, "2027-01-14"],
      endBalancePence: [3700, -1800],
    },
    run: preview(ACCEPTANCE_PLANS.winterBall, { dailySpendPence: 500 }),
  },
  {
    id: "R12",
    description: "Demo (£350, loan Mon 11 Jan) + £60 every Saturday",
    expected: {
      incomeInWindowPence: 48000,
      safeDailyPence: 1404,
      firstOverdraftDate: null,
      endBalancePence: 42400,
    },
    run: () =>
      summariseRunway(
        computeRunway({ ...ACCEPTANCE_DEMO_BASE, incomes: ACCEPTANCE_SATURDAY_SHIFTS }),
      ),
  },
  {
    id: "R13",
    description: "Demo + £50 one-off on Tue 1 Dec",
    expected: {
      incomeInWindowPence: 5000,
      safeDailyPence: 638,
      firstOverdraftDate: "2027-01-10",
      endBalancePence: -600,
      daysEarly: 1,
    },
    run: () =>
      summariseRunway(
        computeRunway({
          ...ACCEPTANCE_DEMO_BASE,
          incomes: [{ id: "gift", label: "Birthday money", amountPence: 5000, date: "2026-12-01" }],
        }),
      ),
  },
  {
    id: "R14",
    description: "Demo + £200 on loan day itself: outside the window, no change",
    expected: {
      incomeInWindowPence: 0,
      safeDailyPence: 542,
      firstOverdraftDate: "2027-01-04",
      endBalancePence: -5600,
    },
    run: () =>
      summariseRunway(
        computeRunway({
          ...ACCEPTANCE_DEMO_BASE,
          incomes: [{ id: "late", label: "Prize", amountPence: 20000, date: "2027-01-11" }],
        }),
      ),
  },
];

function pick(full: Summary, keys: string[]): Summary {
  const out: Summary = {};
  for (const key of keys) out[key] = key in full ? full[key] : "(missing)";
  return out;
}

function checkCase(c: RunwayAcceptanceCase): AcceptanceRow {
  const expected = JSON.stringify(c.expected);
  let actual: string;
  try {
    const full = c.run();
    const picked = pick(full, Object.keys(c.expected));
    // A null preview or an error result has none of the expected keys: show it whole instead.
    actual = Object.values(picked).every((v) => v === "(missing)")
      ? JSON.stringify(full)
      : JSON.stringify(picked);
  } catch (err) {
    actual = `threw: ${err instanceof Error ? err.message : String(err)}`;
  }
  return { id: c.id, description: c.description, expected, actual, pass: actual === expected };
}

export function runRunwayAcceptance(): AcceptanceRow[] {
  return RUNWAY_ACCEPTANCE_CASES.map(checkCase);
}
