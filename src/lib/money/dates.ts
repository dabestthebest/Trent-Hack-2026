// Calendar-date helpers for Til Loan Day. Dates are "YYYY-MM-DD" strings with no time or timezone.
// Arithmetic uses UTC day numbers, so daylight-saving changes can never shift a date.

import type { ISODate } from "./types";

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

export function isValidISODate(s: string): boolean {
  const m = ISO_RE.exec(s);
  if (m === null) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  const back = new Date(Date.UTC(y, mo - 1, d));
  return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d;
}

/** Whole days since 1970-01-01 for a valid ISO date. Throws on invalid input. */
export function dayNumber(d: ISODate): number {
  const m = ISO_RE.exec(d);
  if (m === null || !isValidISODate(d)) throw new Error(`Invalid date: ${d}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY;
}

export function fromDayNumber(n: number): ISODate {
  const dt = new Date(n * MS_PER_DAY);
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1, 2)}-${pad(dt.getUTCDate(), 2)}`;
}

/** The local calendar date of `now` (the device's own idea of "today"). */
export function todayISO(now: Date = new Date()): ISODate {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`;
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromDayNumber(dayNumber(d) + n);
}

/** a - b in whole days. */
export function diffDays(a: ISODate, b: ISODate): number {
  return dayNumber(a) - dayNumber(b);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(d: ISODate): number {
  return new Date(dayNumber(d) * MS_PER_DAY).getUTCDay();
}

/** "Sun 10 Jan" */
export function formatDay(d: ISODate): string {
  const dt = new Date(dayNumber(d) * MS_PER_DAY);
  return `${WEEKDAYS_SHORT[dt.getUTCDay()] ?? ""} ${dt.getUTCDate()} ${MONTHS_SHORT[dt.getUTCMonth()] ?? ""}`;
}

/** "Sunday 10 January" */
export function formatDayLong(d: ISODate): string {
  const dt = new Date(dayNumber(d) * MS_PER_DAY);
  return `${WEEKDAYS_LONG[dt.getUTCDay()] ?? ""} ${dt.getUTCDate()} ${MONTHS_LONG[dt.getUTCMonth()] ?? ""}`;
}

/** "Jan" */
export function monthShort(d: ISODate): string {
  return MONTHS_SHORT[new Date(dayNumber(d) * MS_PER_DAY).getUTCMonth()] ?? "";
}

/** Day of the month, 1–31. */
export function dayOfMonth(d: ISODate): number {
  return new Date(dayNumber(d) * MS_PER_DAY).getUTCDate();
}
