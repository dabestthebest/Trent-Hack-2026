// Small IOUs ("microloans"): crisps money, a borrowed tenner, a lift you owe someone. Money owed to
// you is never counted in the runway, in case it doesn't come back. Pure, so it is easy to test.

import { pounds } from "@/lib/dibs/format";

export type IouDirection = "owed" | "owe"; // owed = they owe me; owe = I owe them
export type IouKind = "money" | "favour";

export interface Iou {
  id: string;
  direction: IouDirection;
  who: string;
  kind: IouKind;
  /** Whole pence, for kind "money". */
  amountPence: number;
  /** What the favour is, or what the money was for ("crisps"). */
  what: string;
  settled: boolean;
}

export interface IouTotals {
  owedToMePence: number;
  iOwePence: number;
  favoursOwedToMe: number;
  favoursIOwe: number;
}

export function iouTotals(ious: readonly Iou[]): IouTotals {
  const t: IouTotals = { owedToMePence: 0, iOwePence: 0, favoursOwedToMe: 0, favoursIOwe: 0 };
  for (const i of ious) {
    if (i.settled) continue;
    if (i.kind === "money") {
      if (i.direction === "owed") t.owedToMePence += i.amountPence;
      else t.iOwePence += i.amountPence;
    } else if (i.direction === "owed") t.favoursOwedToMe += 1;
    else t.favoursIOwe += 1;
  }
  return t;
}

/** "Sam owes you £0.80 for crisps" / "You owe Alex a lift to the station". */
export function describeIou(i: Iou): string {
  const who = i.who.trim() || "Someone";
  const what = i.what.trim();
  if (i.kind === "money") {
    const forWhat = what ? ` for ${what}` : "";
    return i.direction === "owed"
      ? `${who} owes you ${pounds(i.amountPence)}${forWhat}`
      : `You owe ${who} ${pounds(i.amountPence)}${forWhat}`;
  }
  const favour = what || "a favour";
  return i.direction === "owed" ? `${who} owes you ${favour}` : `You owe ${who} ${favour}`;
}

/** A friendly, no-pressure nudge for something owed to you. */
export function reminderText(i: Iou): string {
  const who = i.who.trim();
  const hi = who ? `Hey ${who}!` : "Hey!";
  const what = i.what.trim();
  if (i.kind === "money") {
    const forWhat = what ? ` for ${what}` : "";
    return `${hi} Quick one: you owe me ${pounds(i.amountPence)}${forWhat}. No rush 😄`;
  }
  return `${hi} Just a friendly nudge about ${what || "that favour"} 😄`;
}

/** A plain "I've not forgotten" message for something you owe. */
export function owedMessage(i: Iou): string {
  const who = i.who.trim();
  const hi = who ? `Hey ${who}!` : "Hey!";
  return i.kind === "money"
    ? `${hi} Not forgotten the ${pounds(i.amountPence)}${i.what.trim() ? ` for ${i.what.trim()}` : ""}, sending it soon 🙏`
    : `${hi} Not forgotten I owe you ${i.what.trim() || "a favour"} 🙏`;
}
