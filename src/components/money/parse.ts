// Careful string -> integer pence parsing for the Runway forms. Money is never held as a float.

import { isValidISODate } from "@/lib/money/dates";
import type { ISODate } from "@/lib/money/types";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface MoneyRules {
  /** Allow exactly £0 (balance, overdraft, daily spend). Plans and bills must be above £0. */
  allowZero: boolean;
  /** Upper bound in pence. Defaults to £1,000,000. */
  maxPence?: number;
  /** Message when the field is empty. */
  emptyMessage?: string;
}

const DEFAULT_MAX_PENCE = 100_000_000;
const PLAIN = /^(\d*)(?:\.(\d*))?$/;
const THOUSANDS = /^\d{1,3}(?:,\d{3})+(?:\.\d*)?$/;

function poundsWhole(pence: number): string {
  return `£${Math.floor(pence / 100).toLocaleString("en-GB")}`;
}

/**
 * Parse "£1,234.56", "6.5", "6.", ".50" or "400" into integer pence.
 * Rejects negatives, more than 2 decimal places, decimal commas and anything that is not a number.
 */
export function parsePounds(raw: string, rules: MoneyRules): Parsed<number> {
  const max = rules.maxPence ?? DEFAULT_MAX_PENCE;
  let s = raw.trim().replace(/^£\s*/, "").replace(/\s+/g, "");

  if (s === "") return { ok: false, error: rules.emptyMessage ?? "Enter an amount." };
  if (s.startsWith("-") || s.startsWith("−")) {
    return { ok: false, error: "Enter £0 or more." };
  }
  if (s.includes(",")) {
    if (!THOUSANDS.test(s)) return { ok: false, error: "Use a dot for pence, like 6.50." };
    s = s.replace(/,/g, "");
  }

  const m = PLAIN.exec(s);
  const whole = m?.[1] ?? "";
  const frac = m?.[2] ?? "";
  if (m === null || (whole === "" && frac === "")) {
    return { ok: false, error: "Use numbers only, like 6.50." };
  }
  if (frac.length > 2) return { ok: false, error: "Use at most 2 decimal places." };
  if (whole.replace(/^0+/, "").length > 9) {
    return { ok: false, error: `Enter up to ${poundsWhole(max)}.` };
  }

  const pence = Number(whole === "" ? "0" : whole) * 100 + Number(`${frac}00`.slice(0, 2));
  if (!Number.isSafeInteger(pence) || pence > max) {
    return { ok: false, error: `Enter up to ${poundsWhole(max)}.` };
  }
  if (!rules.allowZero && pence === 0) return { ok: false, error: "Enter an amount above £0." };
  return { ok: true, value: pence };
}

/** Integer pence -> "400.00" for an input's value (no £ sign, no separators). */
export function penceToInput(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(pence));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export const LABEL_MAX = 40;

export function parseLabel(raw: string): Parsed<string> {
  const label = raw.trim().replace(/\s+/g, " ");
  if (label === "") return { ok: false, error: "Say what it is." };
  if (label.length > LABEL_MAX)
    return { ok: false, error: `Keep it under ${LABEL_MAX} characters.` };
  return { ok: true, value: label };
}

export interface DateRules {
  /** Earliest allowed date (inclusive). */
  min?: ISODate;
  minMessage?: string;
}

export function parseDate(raw: string, rules: DateRules = {}): Parsed<ISODate> {
  const s = raw.trim();
  if (s === "") return { ok: false, error: "Pick a date." };
  if (!isValidISODate(s)) return { ok: false, error: "Pick a real date." };
  // ISO dates compare correctly as strings.
  if (rules.min !== undefined && s < rules.min) {
    return { ok: false, error: rules.minMessage ?? "Pick a later date." };
  }
  return { ok: true, value: s };
}
