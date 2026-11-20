// Til Loan Day runway engine. Pure functions over integer pence and calendar dates.
// Matches the exact Python reference (check/runway_ref.py) on every field; see runway.test.ts.
//
// Window: spending days are today .. loanDate-1 (days = loanDate - today). Bills dated inside the
// window are paid at the end of their day. End balance of day k (k = 1..days) is
//   balance - dailySpend * k - (in-window bills dated on or before day k).

import { dayNumber, diffDays, fromDayNumber, isValidISODate } from "./dates";
import type {
  Bill,
  DayCell,
  DayStatus,
  ISODate,
  Plan,
  PlanPreview,
  RunwayError,
  RunwayInput,
  RunwayResult,
  Verdict,
} from "./types";

/** Longest runway the engine accepts. Student Finance gaps are at most a few months; this stops a
 *  mistyped year (e.g. 2207) from building a calendar with tens of thousands of days. */
export const MAX_RUNWAY_DAYS = 366;

/** Largest amount accepted for any single money field (£10,000,000). Keeps every sum exact. */
export const MAX_MONEY_PENCE = 1_000_000_000;

/** id given to a previewed plan when it is added to the bills for the "after" runway. */
export const PREVIEW_BILL_ID = "__plan-preview__";

function invalid(message: string): RunwayError {
  return { ok: false, reason: "invalid-input", message };
}

/** null if `value` is valid money (a whole number of pence, 0 or more), else the problem. */
function moneyProblem(value: unknown, name: string): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return `${name} must be a number.`;
  if (!Number.isInteger(value)) return `${name} must be a whole number of pence.`;
  if (value < 0) return `${name} can't be negative.`;
  if (value > MAX_MONEY_PENCE) return `${name} is too large.`;
  return null;
}

function isISODate(value: unknown): value is ISODate {
  return typeof value === "string" && isValidISODate(value);
}

function validate(input: RunwayInput): RunwayError | null {
  if (typeof input !== "object" || input === null) return invalid("Missing runway input.");
  if (!isISODate(input.today)) return invalid("Today isn't a valid date.");
  if (!isISODate(input.loanDate)) return invalid("Loan day isn't a valid date.");

  const money: [unknown, string][] = [
    [input.balancePence, "Balance"],
    [input.overdraftPence, "Arranged overdraft"],
    [input.dailySpendPence, "Usual spend per day"],
  ];
  for (const [value, name] of money) {
    const problem = moneyProblem(value, name);
    if (problem !== null) return invalid(problem);
  }

  if (!Array.isArray(input.bills)) return invalid("Bills must be a list.");
  for (const bill of input.bills as unknown[]) {
    if (typeof bill !== "object" || bill === null) return invalid("Each bill needs details.");
    const b = bill as Partial<Record<keyof Bill, unknown>>;
    if (typeof b.label !== "string") return invalid("Each bill needs a name.");
    const label = b.label.trim() !== "" ? b.label.trim() : "A bill";
    const problem = moneyProblem(b.amountPence, label);
    if (problem !== null) return invalid(problem);
    if (!isISODate(b.date)) return invalid(`${label} doesn't have a valid date.`);
  }
  return null;
}

function statusOf(endBalancePence: number, overdraftPence: number): DayStatus {
  if (endBalancePence >= 0) return "own";
  if (endBalancePence >= -overdraftPence) return "overdraft";
  return "exhausted";
}

export function computeRunway(input: RunwayInput): RunwayResult {
  const problem = validate(input);
  if (problem !== null) return problem;

  const start = dayNumber(input.today);
  const days = dayNumber(input.loanDate) - start;
  if (days <= 0) {
    return {
      ok: false,
      reason: "loan-date-not-after-today",
      message: "Loan day needs to be after today.",
    };
  }
  if (days > MAX_RUNWAY_DAYS) {
    return invalid(`Loan day needs to be within ${MAX_RUNWAY_DAYS} days of today.`);
  }

  // Bucket the in-window bills by day index (0 = today), keeping their input order.
  const billsByDay: number[] = new Array<number>(days).fill(0);
  const labelsByDay: string[][] = Array.from({ length: days }, () => []);
  let billsInWindowPence = 0;
  for (const bill of input.bills) {
    const idx = dayNumber(bill.date) - start;
    if (idx < 0 || idx >= days) continue;
    billsByDay[idx] = (billsByDay[idx] ?? 0) + bill.amountPence;
    labelsByDay[idx]?.push(bill.label);
    billsInWindowPence += bill.amountPence;
  }

  const { balancePence, overdraftPence, dailySpendPence } = input;
  const timeline: DayCell[] = [];
  let cumBills = 0;
  let minCandidate = Number.POSITIVE_INFINITY;
  let firstOverdraftIdx: number | null = null;
  let firstExhaustedIdx: number | null = null;
  let billsAloneIdx: number | null = null;

  for (let idx = 0; idx < days; idx++) {
    const k = idx + 1;
    const billsPence = billsByDay[idx] ?? 0;
    cumBills += billsPence;
    const endBalancePence = balancePence - dailySpendPence * k - cumBills;
    const status = statusOf(endBalancePence, overdraftPence);
    if (endBalancePence < 0 && firstOverdraftIdx === null) firstOverdraftIdx = idx;
    if (endBalancePence < -overdraftPence && firstExhaustedIdx === null) firstExhaustedIdx = idx;

    // What is left for spending after the bills so far, shared over the k days so far.
    const available = balancePence - cumBills;
    if (available < 0 && billsAloneIdx === null) billsAloneIdx = idx;
    const candidate = available >= 0 ? Math.floor(available / k) : -1;
    if (candidate < minCandidate) minCandidate = candidate;

    timeline.push({
      date: fromDayNumber(start + idx),
      billsPence,
      billLabels: labelsByDay[idx] ?? [],
      endBalancePence,
      status,
    });
  }

  const dateAt = (idx: number | null): ISODate | null =>
    idx === null ? null : fromDayNumber(start + idx);
  const last = timeline[timeline.length - 1];

  return {
    ok: true,
    days,
    billsInWindowPence,
    safeDailyPence: Math.max(0, minCandidate),
    billsAloneOverdraftDate: dateAt(billsAloneIdx),
    timeline,
    firstOverdraftDate: dateAt(firstOverdraftIdx),
    firstExhaustedDate: dateAt(firstExhaustedIdx),
    endBalancePence: last ? last.endBalancePence : balancePence,
    daysEarly: firstOverdraftIdx === null ? null : days - firstOverdraftIdx,
  };
}

/** True if `date` is a spending day of this runway (today .. loanDate-1). */
export function isInWindow(input: Pick<RunwayInput, "today" | "loanDate">, date: ISODate): boolean {
  if (!isISODate(date) || !isISODate(input.today) || !isISODate(input.loanDate)) return false;
  const d = dayNumber(date);
  return d >= dayNumber(input.today) && d < dayNumber(input.loanDate);
}

/** What saying yes to `plan` does to the runway. null when the base runway (or the plan) is invalid. */
export function previewPlan(input: RunwayInput, plan: Plan): PlanPreview | null {
  const before = computeRunway(input);
  if (!before.ok) return null;
  if (typeof plan !== "object" || plan === null) return null;

  const cleanPlan: Plan = { label: plan.label, amountPence: plan.amountPence, date: plan.date };
  const planBill: Bill = { id: PREVIEW_BILL_ID, ...cleanPlan };
  const after = computeRunway({ ...input, bills: [...input.bills, planBill] });
  if (!after.ok) return null;

  let verdict: Verdict;
  if (!isInWindow(input, cleanPlan.date)) verdict = "outside-window";
  else if (after.firstExhaustedDate !== null) verdict = "exhausted";
  else if (after.firstOverdraftDate !== null) verdict = "overdraft";
  else verdict = "fine";

  return {
    plan: cleanPlan,
    verdict,
    before,
    after,
    causesOverdraft: before.firstOverdraftDate === null && after.firstOverdraftDate !== null,
    safeDailyDeltaPence: after.safeDailyPence - before.safeDailyPence,
    endBalanceDeltaPence: after.endBalancePence - before.endBalancePence,
    daysEarlierOverdraft:
      before.firstOverdraftDate !== null && after.firstOverdraftDate !== null
        ? diffDays(before.firstOverdraftDate, after.firstOverdraftDate)
        : null,
  };
}

/** How many days of the timeline are in each status. */
export function countStatuses(timeline: readonly DayCell[]): Record<DayStatus, number> {
  const counts: Record<DayStatus, number> = { own: 0, overdraft: 0, exhausted: 0 };
  for (const cell of timeline) counts[cell.status] += 1;
  return counts;
}
