// Shared contract for Til Loan Day (the runway tool). Money is integer pence.
// Dates are calendar dates as ISO strings "YYYY-MM-DD", with no time or timezone.

export type ISODate = string;

export interface Bill {
  id: string;
  label: string;
  amountPence: number;
  date: ISODate;
}

/** Money the student expects to come in (a shift's pay, birthday money). Their own estimate. */
export interface Income {
  id: string;
  label: string;
  amountPence: number;
  date: ISODate;
}

/** A one-off thing the student is thinking of saying yes to. */
export interface Plan {
  label: string;
  amountPence: number;
  date: ISODate;
}

export interface RunwayInput {
  /** Day 1 of the runway. Spending happens every day from today up to the day before loan day. */
  today: ISODate;
  /** The next Student Finance payment. Not a spending day. */
  loanDate: ISODate;
  balancePence: number;
  /** Arranged overdraft limit, as a positive number (0 = none). */
  overdraftPence: number;
  /** Usual spend per day, excluding the dated bills. */
  dailySpendPence: number;
  bills: Bill[];
  /** Expected money in. Counts only if dated today..loanDate-1, and arrives at the end of its day. */
  incomes?: Income[];
}

export type DayStatus = "own" | "overdraft" | "exhausted";

export interface DayCell {
  date: ISODate;
  /** Bills paid on this day (only bills inside the window). */
  billsPence: number;
  billLabels: string[];
  /** Balance at the end of this day at the usual daily spend (after that day's bills and income). */
  endBalancePence: number;
  /** own: end >= 0; overdraft: -overdraft <= end < 0; exhausted: end < -overdraft. */
  status: DayStatus;
}

export interface RunwayOk {
  ok: true;
  /** Spending days = loanDate - today. */
  days: number;
  /** Bills dated today..loanDate-1. */
  billsInWindowPence: number;
  /** Expected income dated today..loanDate-1. */
  incomeInWindowPence: number;
  /** Largest whole-pence daily spend that never takes the balance below 0 on any day, given the bills
   *  and income (max(0, floor(min over k of (balance - billsUpTo(k) + incomeUpTo(k)) / k))). */
  safeDailyPence: number;
  /** First day on which the bills alone (with zero spending, after income) take the balance below 0,
   *  else null. */
  billsAloneOverdraftDate: ISODate | null;
  timeline: DayCell[];
  /** First day whose end balance is below 0 at the usual daily spend, else null. */
  firstOverdraftDate: ISODate | null;
  /** First day whose end balance is below -overdraft, else null. */
  firstExhaustedDate: ISODate | null;
  /** End balance of the last spending day (the day before loan day). */
  endBalancePence: number;
  /** loanDate - firstOverdraftDate in days, else null. */
  daysEarly: number | null;
}

export interface RunwayError {
  ok: false;
  reason: "loan-date-not-after-today" | "invalid-input";
  message: string;
}

export type RunwayResult = RunwayOk | RunwayError;

/** fine: no overdraft with the plan; overdraft: dips below 0; exhausted: goes past the overdraft;
 *  outside-window: the plan is dated before today or on/after loan day, so it does not affect this runway. */
export type Verdict = "fine" | "overdraft" | "exhausted" | "outside-window";

export interface PlanPreview {
  plan: Plan;
  verdict: Verdict;
  before: RunwayOk;
  after: RunwayOk;
  /** True if there was no overdraft before the plan and there is one with it. */
  causesOverdraft: boolean;
  safeDailyDeltaPence: number;
  endBalanceDeltaPence: number;
  /** before.firstOverdraftDate - after.firstOverdraftDate in days, when both exist; else null. */
  daysEarlierOverdraft: number | null;
}

// Engine API (src/lib/money/runway.ts):
//   computeRunway(input: RunwayInput): RunwayResult
//   previewPlan(input: RunwayInput, plan: Plan): PlanPreview | null   (null when the base runway is not ok)
// Dates (src/lib/money/dates.ts):
//   todayISO(now?: Date): ISODate          local calendar date of `now`
//   addDays(d: ISODate, n: number): ISODate
//   diffDays(a: ISODate, b: ISODate): number   a - b in whole days
//   formatDay(d: ISODate): string          "Sun 10 Jan"
//   formatDayLong(d: ISODate): string      "Sunday 10 January"
//   isValidISODate(s: string): boolean
// Reply (src/lib/money/reply.ts):
//   replyFor(preview: PlanPreview): string   tactful group-chat reply for the verdict
