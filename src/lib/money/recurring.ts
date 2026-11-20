// Recurring money for Til Loan Day: part-time pay, paydays and subscriptions, expanded into dated
// items the runway engine understands. Pure; calendar dates only (UTC day numbers, never local time).

import { dayNumber, fromDayNumber, isValidISODate } from "./dates";
import type { ISODate } from "./types";

export type Frequency = "once" | "weekly" | "fortnightly" | "monthly";

export interface RecurringItem {
  id: string;
  label: string;
  amountPence: number;
  /** The first time it happens. Monthly items repeat on this day of the month. */
  firstDate: ISODate;
  frequency: Frequency;
}

export interface DatedItem {
  id: string;
  label: string;
  amountPence: number;
  date: ISODate;
}

export const FREQUENCIES: readonly Frequency[] = ["once", "weekly", "fortnightly", "monthly"];

/** Safety cap on occurrences per item (a year of weekly items is 53). */
const MAX_OCCURRENCES = 1000;

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** The n-th monthly occurrence after `first` (n = 0 is `first`), clamped to the month's last day. */
function monthlyOccurrence(first: ISODate, n: number): ISODate {
  const y = Number(first.slice(0, 4));
  const m0 = Number(first.slice(5, 7)) - 1;
  const d = Number(first.slice(8, 10));
  const total = m0 + n;
  const year = y + Math.floor(total / 12);
  const month0 = ((total % 12) + 12) % 12;
  const day = Math.min(d, daysInMonth(year, month0));
  return `${pad(year, 4)}-${pad(month0 + 1, 2)}-${pad(day, 2)}`;
}

/**
 * Every occurrence of `item` dated from `from` (inclusive) up to `toExclusive`, in date order.
 * Monthly repeats on the first date's day of the month, clamped to shorter months
 * (31 Jan → 28 Feb → 31 Mar). Ids are `${item.id}@${date}`. Invalid dates give no occurrences.
 */
export function expandRecurring(
  item: RecurringItem,
  from: ISODate,
  toExclusive: ISODate,
): DatedItem[] {
  if (!isValidISODate(item.firstDate) || !isValidISODate(from) || !isValidISODate(toExclusive)) {
    return [];
  }
  const start = dayNumber(from);
  const end = dayNumber(toExclusive);
  const first = dayNumber(item.firstDate);
  if (end <= start) return [];

  const out: DatedItem[] = [];
  const push = (date: ISODate) =>
    out.push({ id: `${item.id}@${date}`, label: item.label, amountPence: item.amountPence, date });

  if (item.frequency === "once") {
    if (first >= start && first < end) push(item.firstDate);
    return out;
  }

  if (item.frequency === "weekly" || item.frequency === "fortnightly") {
    const step = item.frequency === "weekly" ? 7 : 14;
    // Jump straight to the first occurrence on or after `from`.
    const skip = first >= start ? 0 : Math.ceil((start - first) / step);
    for (let i = 0, day = first + skip * step; day < end && i < MAX_OCCURRENCES; i++, day += step) {
      push(fromDayNumber(day));
    }
    return out;
  }

  // Monthly.
  for (let n = 0; n < MAX_OCCURRENCES; n++) {
    const date = monthlyOccurrence(item.firstDate, n);
    const day = dayNumber(date);
    if (day >= end) break;
    if (day >= start) push(date);
  }
  return out;
}

/** Expand a list of recurring items over [from, toExclusive), sorted by date (stable). */
export function expandAll(
  items: readonly RecurringItem[],
  from: ISODate,
  toExclusive: ISODate,
): DatedItem[] {
  const all = items.flatMap((item) => expandRecurring(item, from, toExclusive));
  return all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** The pence a recurring item costs (or brings in) per month, roughly: weekly × 52 / 12, rounded. */
export function monthlyEquivalentPence(item: Pick<RecurringItem, "amountPence" | "frequency">) {
  switch (item.frequency) {
    case "monthly":
      return item.amountPence;
    case "weekly":
      return Math.round((item.amountPence * 52) / 12);
    case "fortnightly":
      return Math.round((item.amountPence * 26) / 12);
    case "once":
      return 0;
  }
}
