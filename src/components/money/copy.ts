// Every user-facing sentence on the Runway page that depends on the numbers. Pure, so it is easy to test.

import { pounds, signedPounds } from "@/lib/dibs/format";
import { formatDay } from "@/lib/money/dates";
import type { DayCell, DayStatus, ISODate, Plan, PlanPreview, RunwayOk } from "@/lib/money/types";

/** "£55" for whole pounds, otherwise "£10.50". Negative uses U+2212 like pounds(). */
export function poundsShort(pence: number): string {
  if (pence % 100 !== 0) return pounds(pence);
  const sign = pence < 0 ? "−" : "";
  return `${sign}£${String(Math.abs(pence) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function dayCount(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}

export function daysToLoanPill(days: number): string {
  return `${dayCount(days)} to loan day`;
}

export function safeUntilLine(loanDate: ISODate): string {
  return `safe to spend until ${formatDay(loanDate)}`;
}

export type Tone = "own" | "overdraft" | "exhausted";

export interface PaceLine {
  tone: Tone;
  text: string;
}

export function paceLine(r: RunwayOk, dailySpendPence: number, overdraftPence: number): PaceLine {
  const usual = `At your usual ${pounds(dailySpendPence)} a day`;
  if (r.firstExhaustedDate !== null) {
    if (overdraftPence === 0) {
      return {
        tone: "exhausted",
        text: `${usual}, you'd go below £0 on ${formatDay(r.firstExhaustedDate)}, ${dayCount(r.daysEarly ?? 0)} before loan day, with no overdraft to fall back on.`,
      };
    }
    return {
      tone: "exhausted",
      text: `${usual}, your ${poundsShort(overdraftPence)} overdraft runs out on ${formatDay(r.firstExhaustedDate)}.`,
    };
  }
  if (r.firstOverdraftDate !== null) {
    return {
      tone: "overdraft",
      text: `${usual}, you'd dip into your overdraft on ${formatDay(r.firstOverdraftDate)}, ${dayCount(r.daysEarly ?? 0)} before loan day.`,
    };
  }
  return {
    tone: "own",
    text: `${usual}, you'll reach loan day with ${pounds(r.endBalancePence)} to spare.`,
  };
}

export function billsAloneLine(date: ISODate): string {
  return `Your bills alone take you below £0 on ${formatDay(date)}.`;
}

export function verdictHeadline(p: PlanPreview, today: ISODate, overdraftPence: number): string {
  switch (p.verdict) {
    case "fine":
      return "Yes, you can afford it.";
    case "overdraft": {
      if (p.causesOverdraft) return "It would push you into your overdraft.";
      const n = p.daysEarlierOverdraft ?? 0;
      if (n <= 0) return "You'd go further into your overdraft.";
      return `You'd hit your overdraft ${dayCount(n)} sooner.`;
    }
    case "exhausted":
      return overdraftPence === 0
        ? "This would take you below £0, with no overdraft to fall back on."
        : "This would use up your whole overdraft.";
    case "outside-window":
      return p.plan.date < today
        ? "That's before today, so it doesn't change this runway."
        : "That's after loan day, so it doesn't change this runway.";
  }
}

export function dateOrNever(d: ISODate | null): string {
  return d === null ? "Never" : formatDay(d);
}

export interface PreviewRow {
  label: string;
  value: string;
  hint: string | null;
  change: string;
}

export function previewRows(p: PlanPreview, overdraftPence: number): PreviewRow[] {
  const { before, after } = p;

  const safeChange =
    p.safeDailyDeltaPence === 0 ? "No change" : `${signedPounds(p.safeDailyDeltaPence)} a day`;

  let odChange = "No change";
  if (before.firstOverdraftDate === null && after.firstOverdraftDate !== null) {
    odChange = "New with this plan";
  } else if (p.daysEarlierOverdraft !== null && p.daysEarlierOverdraft > 0) {
    odChange = `${dayCount(p.daysEarlierOverdraft)} sooner`;
  }

  const end = after.endBalancePence;
  let endHint: string | null = null;
  if (end >= 0) endHint = "to spare";
  else if (overdraftPence > 0 && end >= -overdraftPence) {
    endHint = `of your ${poundsShort(overdraftPence)} overdraft`;
  } else if (overdraftPence > 0)
    endHint = `more than your ${poundsShort(overdraftPence)} overdraft`;
  else endHint = "and you have no overdraft";

  return [
    {
      label: "Safe to spend",
      value: `${pounds(before.safeDailyPence)} → ${pounds(after.safeDailyPence)} a day`,
      hint: null,
      change: safeChange,
    },
    {
      label: "Overdraft from",
      value: `${dateOrNever(before.firstOverdraftDate)} → ${dateOrNever(after.firstOverdraftDate)}`,
      hint: null,
      change: odChange,
    },
    {
      label: "Day before loan day",
      value: `${pounds(before.endBalancePence)} → ${pounds(end)}`,
      hint: endHint,
      change: p.endBalanceDeltaPence === 0 ? "No change" : signedPounds(p.endBalanceDeltaPence),
    },
  ];
}

export function chipText(plan: Plan & { emoji?: string | undefined }): string {
  const lead = plan.emoji ? `${plan.emoji} ` : "";
  return `${lead}${plan.label} · ${poundsShort(plan.amountPence)} · ${formatDay(plan.date)}`;
}

export const STATUS_TEXT: Record<DayStatus, string> = {
  own: "your own money",
  overdraft: "in your overdraft",
  exhausted: "overdraft used up",
};

export function cellLabel(
  cell: DayCell,
  opts: { isToday: boolean; changed: boolean } = { isToday: false, changed: false },
): string {
  let s = `${formatDay(cell.date)}: ${pounds(cell.endBalancePence)}, ${STATUS_TEXT[cell.status]}`;
  if (cell.billLabels.length > 0) {
    s += `. ${cell.billLabels.join(" and ")} due (${pounds(cell.billsPence)})`;
  }
  if (opts.isToday) s += ". Today";
  if (opts.changed) s += ". Changed by this plan";
  return s;
}

export type StatusCounts = Record<DayStatus, number>;

/** "51 days on your own money · 8 in your overdraft", with "(was N)" when comparing with a plan. */
export function countsLine(now: StatusCounts, was: StatusCounts | null): string {
  const part = (n: number, prev: number | undefined, text: string, withDays: boolean) => {
    const head = withDays ? dayCount(n) : String(n);
    const tail = prev !== undefined && prev !== n ? ` (was ${prev})` : "";
    return `${head} ${text}${tail}`;
  };
  const parts = [part(now.own, was?.own, "on your own money", true)];
  if (now.overdraft > 0 || (was !== null && was.overdraft > 0)) {
    parts.push(part(now.overdraft, was?.overdraft, "in your overdraft", false));
  }
  if (now.exhausted > 0 || (was !== null && was.exhausted > 0)) {
    parts.push(part(now.exhausted, was?.exhausted, "past it", false));
  }
  return parts.join(" · ");
}

export function jarLine(skippedPence: number): string {
  return `🫙 ${pounds(skippedPence)} saved by skipping`;
}

export function removeBillLabel(label: string, date: ISODate): string {
  return `Remove ${label} on ${formatDay(date)}`;
}
