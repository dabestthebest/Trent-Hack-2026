// "Ask a parent": a short, polite message about one big bill (rent, tuition, a deposit) that the
// student can send to a parent in the app they already use. Pure, so it is easy to test.
// Nothing here sends anything: the student picks the app and presses send there.

import { formatDay, isValidISODate } from "./dates";
import type { ISODate, PlanPreview } from "./types";

export interface AskParentInput {
  /** Who it's for ("Mum", "Dad", a name). Empty for a plain "Hi!". */
  name: string;
  label: string;
  amountPence: number;
  date: ISODate;
  /** The next student loan payment, or null when there isn't a sensible one to mention. */
  loanDate: ISODate | null;
  /** From impactPhrase(), e.g. "use up my whole overdraft", or null. */
  impact: string | null;
  /** A choice rather than a bill (a trip, voluntary upfront rent): "I'm planning to pay…" instead of "big bill… due". */
  optional?: boolean | undefined;
}

/** £100 or more counts as a big bill, whatever it's called. */
export const BIG_BILL_PENCE = 10_000;

const BIG_BILL_RE = /\b(rent|housing|accommodation|halls|deposit|tuition|fees?)\b/i;

const OBLIGATION_RE = /\b(rent|housing|accommodation|halls|tuition|fees?)\b/i;

/** Money you still owe whatever happens (rent, halls, tuition): skipping it doesn't save anything. */
export function isObligation(label: string): boolean {
  return OBLIGATION_RE.test(label);
}

/** Bills a parent might help with: £100 or more, or anything that sounds like rent, halls or fees. */
export function isBigBill(p: { label: string; amountPence: number }): boolean {
  return p.amountPence >= BIG_BILL_PENCE || BIG_BILL_RE.test(p.label);
}

/** "£1,140.00": like pounds(), with thousands separators. Negative uses U+2212. */
export function poundsWithCommas(pence: number): string {
  const sign = pence < 0 ? "−" : "";
  const abs = Math.abs(Math.round(pence));
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}£${whole}.${String(abs % 100).padStart(2, "0")}`;
}

/** What paying the bill from the student's own money would do, in the first person, or null when
 *  it's affordable or falls outside the runway. */
export function impactPhrase(preview: PlanPreview): string | null {
  switch (preview.verdict) {
    case "outside-window":
    case "fine":
      return null;
    case "exhausted":
      return "use up my whole overdraft";
    case "overdraft": {
      if (preview.causesOverdraft) return "push me into my overdraft";
      const n = preview.daysEarlierOverdraft;
      if (n !== null && n > 0)
        return `put me in my overdraft ${n} ${n === 1 ? "day" : "days"} sooner`;
      return "take me further into my overdraft";
    }
  }
}

/** impactPhrase, but honest when there is no arranged overdraft to "use up". */
export function impactPhraseFor(preview: PlanPreview, overdraftPence: number): string | null {
  if (preview.verdict === "exhausted" && overdraftPence === 0) return "take me below £0";
  return impactPhrase(preview);
}

/** A warm, short message for a parent, in UK English, with one emoji at the end. */
export function askParentMessage(o: AskParentInput): string {
  const name = o.name.trim();
  const label = o.label.trim().replace(/\s+/g, " ");
  const what = label === "" ? "" : `${label}, `;
  const validDate = isValidISODate(o.date);

  let s = name === "" ? "Hi!" : `Hi ${name}!`;
  if (o.optional) {
    const on = validDate ? ` on ${formatDay(o.date)}` : "";
    s += ` I'm planning to pay ${what}${poundsWithCommas(o.amountPence)}${on}.`;
  } else {
    const due = validDate ? `, due ${formatDay(o.date)}` : "";
    s += ` I've got a big bill coming up: ${what}${poundsWithCommas(o.amountPence)}${due}.`;
  }

  const impact = o.impact === null || o.impact.trim() === "" ? null : o.impact.trim();
  const loanDate =
    o.loanDate !== null &&
    isValidISODate(o.loanDate) &&
    isValidISODate(o.date) &&
    o.date < o.loanDate
      ? o.loanDate
      : null;

  if (loanDate !== null) {
    s += ` I'm not expecting my next student loan payment until ${formatDay(loanDate)}`;
    s += impact === null ? "." : `, and paying it from my own money would ${impact}.`;
  } else if (impact !== null) {
    s += ` Paying it from my own money would ${impact}.`;
  }

  s += " Could you help with some or all of it? I can show you the numbers. Thank you 💛";
  return s;
}

/** The email subject for a bill: "Could you help with January rent?". */
export function askParentSubject(label: string): string {
  const text = label.trim().replace(/\s+/g, " ");
  return text === "" ? "Could you help with a bill?" : `Could you help with ${text}?`;
}

export interface ShareLinks {
  whatsapp: string;
  sms: string;
  email: string;
  telegram: string;
}

/** Share links that open each app with the message filled in. None of them sends anything. */
export function shareLinks(message: string, subject: string, appUrl: string): ShareLinks {
  const enc = encodeURIComponent;
  return {
    whatsapp: `https://wa.me/?text=${enc(message)}`,
    sms: `sms:?&body=${enc(message)}`,
    email: `mailto:?subject=${enc(subject)}&body=${enc(message)}`,
    telegram: `https://t.me/share/url?url=${enc(appUrl)}&text=${enc(message)}`,
  };
}
