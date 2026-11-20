// Demo data, copy helpers and the /dibs search param for the shared bills tab. No React here.

import { pounds } from "@/lib/dibs/format";
import type { Expense, Transfer } from "@/lib/house/ledger";
import { addDays } from "@/lib/money/dates";
import type { ISODate } from "@/lib/money/types";

export type DibsTab = "rooms" | "bills";

export interface DibsSearch {
  /** Which tool /dibs shows. Missing means "rooms" (the fair rent split). */
  tab?: DibsTab;
}

/**
 * `/dibs?tab=bills` deep-links to shared bills; anything else falls back to rooms. Always returns a
 * tab, because the router merges this result over the raw search (so `{}` would let `?tab=party` through).
 * The field stays optional in the type so plain `<Link to="/dibs">` links need no search.
 */
export function validateDibsSearch(search: Record<string, unknown>): DibsSearch {
  return { tab: search["tab"] === "bills" ? "bills" : "rooms" };
}

/** Same people as the Dibs bots: person 0 is the student using the app. */
export const HOUSEMATES_DEFAULT = ["You", "Sam", "Alex"] as const;
export const HOUSEMATE_NAME_MAX = 12;
/** "Pay back housemates" lands on the runway this many days from today. */
export const PAY_BACK_DAYS_AHEAD = 3;
/** Upper bound for one shared bill: £10,000. */
export const MAX_EXPENSE_PENCE = 1_000_000;

export function demoExpenses(today: ISODate): Expense[] {
  return [
    {
      id: "demo-tesco",
      label: "🛒 Big Tesco shop",
      amountPence: 4260,
      paidBy: 1,
      splitAmong: [0, 1, 2],
      date: addDays(today, -2),
    },
    {
      id: "demo-wifi",
      label: "📶 Wi-Fi",
      amountPence: 3000,
      paidBy: 0,
      splitAmong: [0, 1, 2],
      date: addDays(today, -5),
    },
    {
      id: "demo-loo-roll",
      label: "🧻 Loo roll + cleaning stuff",
      amountPence: 945,
      paidBy: 2,
      splitAmong: [0, 1, 2],
      date: addDays(today, -1),
    },
  ];
}

/** Display names: a blank name shows as "Person N". */
export function displayNames(raw: readonly string[]): string[] {
  return raw.map((n, i) => n.trim() || `Person ${i + 1}`);
}

/** True when person 0 still has the default name, so sentences read "You owe", not "You owes". */
function isYou(names: readonly string[], i: number): boolean {
  return i === 0 && names[0] === "You";
}

/** "Sam is owed £15.25" / "You owe £4.00" / "Alex is all square". */
export function balanceSentence(names: readonly string[], i: number, net: number): string {
  const name = names[i] ?? `Person ${i + 1}`;
  const you = isYou(names, i);
  if (net > 0) return `${name} ${you ? "are" : "is"} owed ${pounds(net)}`;
  if (net < 0) return `${name} ${you ? "owe" : "owes"} ${pounds(-net)}`;
  return `${name} ${you ? "are" : "is"} all square`;
}

/** "Sam paid · split 3 ways", "Sam paid · split 2 ways (You, Sam)" or "Sam paid · for Alex". */
export function splitLine(names: readonly string[], e: Expense): string {
  const payer = names[e.paidBy] ?? "Someone";
  const among = [...new Set(e.splitAmong)];
  if (among.length === 1) return `${payer} paid · for ${names[among[0] ?? 0] ?? "someone"}`;
  const who = among.length === names.length ? "" : ` (${among.map((i) => names[i]).join(", ")})`;
  return `${payer} paid · split ${among.length} ways${who}`;
}

/** The house-chat message. "You" reads as "me", because the sender is the one sharing it. */
export function settleMessage(
  names: readonly string[],
  transfers: readonly Transfer[],
  expenseCount: number,
  expenseTotalPence: number,
): string {
  const who = (i: number, start: boolean) =>
    isYou(names, i) ? (start ? "Me" : "me") : (names[i] ?? `Person ${i + 1}`);
  return [
    `🧾 House bills settle-up (${expenseCount} shared ${expenseCount === 1 ? "bill" : "bills"}, ${pounds(expenseTotalPence)} total)`,
    ...transfers.map((t) => `${who(t.from, true)} → ${who(t.to, false)} ${pounds(t.amountPence)}`),
    "Worked out with Til Loan Day",
  ].join("\n");
}

export function settleUpHref(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
