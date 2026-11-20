// Penny AI: builds the numbers-only summary sent to the AI, and keeps only tips whose £ amounts
// actually come from those numbers. Pure, so it is easy to test.

import { pounds } from "@/lib/dibs/format";
import { diffDays } from "@/lib/money/dates";
import type { PlanPreview, RunwayInput, RunwayOk } from "@/lib/money/types";

export interface PennySummary {
  today: string;
  loanDate: string;
  daysToLoan: number;
  balancePence: number;
  overdraftPence: number;
  dailySpendPence: number;
  safeDailyPence: number;
  endBalancePence: number;
  firstOverdraftDate: string | null;
  firstExhaustedDate: string | null;
  incomeInWindowPence: number;
  bills: { label: string; amountPence: number; date: string }[];
  incomes: { label: string; amountPence: number; date: string }[];
  plan: {
    label: string;
    amountPence: number;
    date: string;
    verdict: "fine" | "overdraft" | "exhausted" | "outside-window";
    daysEarlierOverdraft: number | null;
  } | null;
}

const MAX_ITEMS = 30;

function inWindow(date: string, input: RunwayInput): boolean {
  return date >= input.today && date < input.loanDate;
}

/** Only numbers and short labels: no free text the student typed beyond item names. */
export function pennySummary(
  input: RunwayInput,
  result: RunwayOk,
  preview: PlanPreview | null,
): PennySummary {
  const clip = (s: string) => s.trim().slice(0, 40);
  const items = (xs: { label: string; amountPence: number; date: string }[]) =>
    xs
      .filter((x) => inWindow(x.date, input))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .slice(0, MAX_ITEMS)
      .map((x) => ({ label: clip(x.label), amountPence: x.amountPence, date: x.date }));
  return {
    today: input.today,
    loanDate: input.loanDate,
    daysToLoan: Math.max(1, Math.min(366, diffDays(input.loanDate, input.today))),
    balancePence: input.balancePence,
    overdraftPence: input.overdraftPence,
    dailySpendPence: input.dailySpendPence,
    safeDailyPence: result.safeDailyPence,
    endBalancePence: result.endBalancePence,
    firstOverdraftDate: result.firstOverdraftDate,
    firstExhaustedDate: result.firstExhaustedDate,
    incomeInWindowPence: result.incomeInWindowPence,
    bills: items(input.bills),
    incomes: items(input.incomes ?? []),
    plan: preview
      ? {
          label: clip(preview.plan.label),
          amountPence: preview.plan.amountPence,
          date: preview.plan.date,
          verdict: preview.verdict,
          daysEarlierOverdraft: preview.daysEarlierOverdraft,
        }
      : null,
  };
}

/** Every amount the AI may legitimately quote: the inputs and their simple differences. */
export function allowedAmounts(s: PennySummary): Set<string> {
  const pence = new Set<number>();
  const add = (p: number) => {
    if (Number.isFinite(p)) pence.add(Math.abs(Math.round(p)));
  };
  [
    s.balancePence,
    s.overdraftPence,
    s.dailySpendPence,
    s.safeDailyPence,
    s.endBalancePence,
    s.incomeInWindowPence,
    s.dailySpendPence - s.safeDailyPence,
    s.overdraftPence + s.endBalancePence,
    (s.dailySpendPence - s.safeDailyPence) * 7,
  ].forEach(add);
  let billTotal = 0;
  for (const b of s.bills) {
    add(b.amountPence);
    billTotal += b.amountPence;
  }
  add(billTotal);
  for (const i of s.incomes) add(i.amountPence);
  if (s.plan) {
    add(s.plan.amountPence);
    add(s.balancePence - s.plan.amountPence);
  }
  const out = new Set<string>();
  for (const p of pence) {
    const full = pounds(p); // "£1,140.00"
    out.add(full);
    out.add(full.replace(/,/g, ""));
    if (p % 100 === 0) {
      const whole = full.replace(/\.00$/, "");
      out.add(whole); // "£1,140"
      out.add(whole.replace(/,/g, ""));
    }
  }
  return out;
}

const MONEY_RE = /£\d[\d,]*(?:\.\d{1,2})?/g;

/** Drops tips that quote any £ amount we didn't give the AI (or can't derive simply). */
export function keepGroundedTips(tips: readonly string[], s: PennySummary): string[] {
  const allowed = allowedAmounts(s);
  return tips
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 160)
    .filter((t) =>
      (t.match(MONEY_RE) ?? []).every((m) => allowed.has(m.replace(/\.(\d)$/, ".$10"))),
    )
    .slice(0, 3);
}
