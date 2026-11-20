// Reads a pasted group-chat invite on the device, with no network. Used as the fallback when the
// AI reader is unavailable, and to sanity-check what the AI returns. Pure functions.

import { addDays, dayNumber, fromDayNumber, isValidISODate, weekday } from "./dates";
import type { ISODate } from "./types";

export interface ParsedInvite {
  label: string | null;
  amountPence: number | null;
  date: ISODate | null;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const WEEKDAYS: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

/** Longest phrases first so "ski trip" wins over "trip". */
const LABELS: [RegExp, string][] = [
  [/\bwinter ball\b/, "Winter ball"],
  [/\b(?:xmas|christmas) (?:meal|dinner|do|party)\b/, "Christmas meal"],
  [/\bsecret santa\b/, "Secret Santa"],
  [/\bski(?:ing)? trip\b/, "Ski trip"],
  [/\bnight out\b/, "Night out"],
  [/\bbirthday\b/, "Birthday"],
  [/\bball\b/, "Ball"],
  [/\bgig\b|\bconcert\b/, "Gig"],
  [/\bfestival\b/, "Festival"],
  [/\bpres\b|\bpre-?drinks\b/, "Pres"],
  [/\bdrinks\b|\bpub\b/, "Drinks"],
  [/\bclub(?:bing)?\b|\brock city\b|\bostrich\b/, "Night out"],
  [/\bdinner\b|\bmeal\b|\bbrunch\b|\blunch\b/, "Meal out"],
  [/\btrip\b|\bholiday\b|\bweekend away\b/, "Trip"],
  [/\bdeposit\b/, "Deposit"],
  [/\btickets?\b/, "Tickets"],
];

function nextOnOrAfter(today: ISODate, month: number, day: number): ISODate | null {
  const t = dayNumber(today);
  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    const iso = `${String(y).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isValidISODate(iso) && dayNumber(iso) >= t) return iso;
  }
  return null;
}

function nextDayOfMonth(today: ISODate, day: number): ISODate | null {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  for (let k = 0; k < 13; k++) {
    const m = ((month - 1 + k) % 12) + 1;
    const y = year + Math.floor((month - 1 + k) / 12);
    const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isValidISODate(iso) && dayNumber(iso) >= dayNumber(today)) return iso;
  }
  return null;
}

function nextWeekday(today: ISODate, target: number, forceNextWeek: boolean): ISODate {
  const delta = (target - weekday(today) + 7) % 7;
  return addDays(today, forceNextWeek ? (delta === 0 ? 7 : delta + 7) : delta);
}

function parseAmount(text: string): number | null {
  const candidates: { pence: number; index: number; each: boolean }[] = [];
  const pushMatch = (raw: string, index: number, after: string) => {
    const pence = Math.round(Number(raw.replace(",", ".")) * 100);
    if (!Number.isFinite(pence) || pence <= 0 || pence > 1_000_000) return;
    const each = /^\s*(?:each|pp|per person|a head|per head|pq)\b/.test(after);
    candidates.push({ pence, index, each });
  };
  for (const m of text.matchAll(/£\s?(\d{1,5}(?:[.,]\d{1,2})?)/g)) {
    pushMatch(
      m[1] ?? "",
      m.index ?? 0,
      text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 16),
    );
  }
  for (const m of text.matchAll(/\b(\d{1,5}(?:\.\d{1,2})?)\s?(?:quid|pounds?|gbp)\b/g)) {
    pushMatch(
      m[1] ?? "",
      m.index ?? 0,
      text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 16),
    );
  }
  if (candidates.length === 0) return null;
  const each = candidates.find((c) => c.each);
  return (each ?? candidates.sort((a, b) => a.index - b.index)[0])?.pence ?? null;
}

function parseDate(text: string, today: ISODate): ISODate | null {
  const monthNames = Object.keys(MONTHS)
    .sort((a, b) => b.length - a.length)
    .join("|");
  // 4th dec / 4 december / 4th of dec
  const dm = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+(${monthNames})\\b`).exec(
    text,
  );
  if (dm) {
    const r = nextOnOrAfter(today, MONTHS[dm[2] ?? ""] ?? 0, Number(dm[1]));
    if (r) return r;
  }
  // dec 4th / december 4
  const md = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(text);
  if (md) {
    const r = nextOnOrAfter(today, MONTHS[md[1] ?? ""] ?? 0, Number(md[2]));
    if (r) return r;
  }
  // 12/12 or 12/12/26 or 12/12/2026 (UK day/month)
  const num = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/.exec(text);
  if (num) {
    const day = Number(num[1]);
    const month = Number(num[2]);
    if (num[3]) {
      const y = num[3].length === 2 ? 2000 + Number(num[3]) : Number(num[3]);
      const iso = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (isValidISODate(iso) && dayNumber(iso) >= dayNumber(today)) return iso;
    } else {
      const r = nextOnOrAfter(today, month, day);
      if (r) return r;
    }
  }
  // "the 10th"
  const nth = /\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b/.exec(text);
  if (nth) {
    const r = nextDayOfMonth(today, Number(nth[1]));
    if (r) return r;
  }
  if (/\b(?:tonight|today)\b/.test(text)) return today;
  if (/\b(?:tomorrow|tmrw|tmr|tomoz)\b/.test(text)) return addDays(today, 1);
  // weekday, optionally "next"; prefer one introduced by "on" over a "by" deadline
  const wdNames = Object.keys(WEEKDAYS)
    .sort((a, b) => b.length - a.length)
    .join("|");
  const all = [...text.matchAll(new RegExp(`\\b(next\\s+)?(${wdNames})\\b`, "g"))];
  if (all.length > 0) {
    const preferred =
      all.find((m) => /\bon\s+$/.test(text.slice(Math.max(0, (m.index ?? 0) - 4), m.index ?? 0))) ??
      all[all.length - 1];
    if (preferred)
      return nextWeekday(today, WEEKDAYS[preferred[2] ?? ""] ?? 0, Boolean(preferred[1]));
  }
  return null;
}

function parseLabel(text: string): string | null {
  const ski = /\bski(?:ing)? trip\b/.test(text) && /\bdeposit\b/.test(text);
  if (ski) return "Ski trip deposit";
  for (const [re, label] of LABELS) if (re.test(text)) return label;
  return null;
}

export function parseInviteLocal(raw: string, today: ISODate): ParsedInvite {
  const text = raw.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  if (text.length === 0) return { label: null, amountPence: null, date: null };
  return { label: parseLabel(text), amountPence: parseAmount(text), date: parseDate(text, today) };
}

/** Keeps only sane values from any reader (AI or local). */
export function sanitiseInvite(p: ParsedInvite, today: ISODate): ParsedInvite {
  const cleaned = p.label ? p.label.replace(/\s+/g, " ").trim().slice(0, 40).trim() : "";
  const label = cleaned.length > 0 ? cleaned : null;
  const amountPence =
    p.amountPence !== null &&
    Number.isInteger(p.amountPence) &&
    p.amountPence > 0 &&
    p.amountPence <= 1_000_000
      ? p.amountPence
      : null;
  let date: ISODate | null = null;
  if (p.date && isValidISODate(p.date)) {
    const diff = dayNumber(p.date) - dayNumber(today);
    if (diff >= 0 && diff <= 365) date = p.date;
  }
  return { label, amountPence, date };
}

export { fromDayNumber as _fromDayNumberForTests };
