// One tactful group-chat reply per preview verdict. Short, friendly, no guilt-tripping, one emoji.

import { addDays, dayNumber, formatDayLong } from "./dates";
import type { PlanPreview } from "./types";

/** Every reply is shorter than this many characters (code points). */
export const MAX_REPLY_LENGTH = 140;

// First words that stay capitalised mid-sentence ("the Christmas meal", not "the christmas meal").
const PROPER_FIRST_WORDS = new Set([
  "christmas",
  "xmas",
  "halloween",
  "easter",
  "diwali",
  "eid",
  "hanukkah",
  "valentine's",
  "valentines",
  "new",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "january",
  "february",
  "march",
  "april",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

// First words that already work as a determiner, so no "the" goes in front.
const DETERMINERS = new Set(["the", "a", "an", "my", "our", "your", "his", "her", "their", "this"]);

/** Things you pay rather than go to, which get "can I pay it later?" replies. */
const PAYMENT_RE = /\b(deposits?|rent|bills?|fees?|instal?ments?)\b/i;

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** The plan as it reads mid-sentence: "Winter ball" → "the winter ball". */
export function planPhrase(label: string): string {
  const text = label.trim().replace(/\s+/g, " ");
  if (text === "") return "this";
  const first = text.split(" ")[0] ?? "";
  const firstLower = first.toLowerCase();
  // "Sophie's birthday": a name, so keep it exactly as typed.
  if (/['’]s$/i.test(first)) return text;
  if (DETERMINERS.has(firstLower)) return lowerFirst(text);
  // "KFC", "iPhone", "McFly": acronyms and names with inner capitals keep their case.
  const keepCase = /[A-Z]/.test(first.slice(1)) || PROPER_FIRST_WORDS.has(firstLower);
  return `the ${keepCase ? text : lowerFirst(text)}`;
}

/** "January" for a loan day in January. */
function monthName(date: string): string {
  return formatDayLong(date).split(" ").pop() ?? "loan day";
}

function codePoints(s: string): number {
  return Array.from(s).length;
}

function compose(preview: PlanPreview, x: string): string {
  const { plan, verdict, causesOverdraft, before } = preview;
  const pay = PAYMENT_RE.test(plan.label);
  const today = before.timeline[0]?.date;
  const lastDay = before.timeline[before.timeline.length - 1]?.date;
  const loanMonth = lastDay ? monthName(addDays(lastDay, 1)) : "loan day";

  switch (verdict) {
    case "fine":
      return pay
        ? `Yes! I can pay ${x}, let's do it 🎉`
        : `Yes!! Count me in for ${x}, can't wait 🎉`;
    case "overdraft":
      if (causesOverdraft) {
        return pay
          ? `Could I pay ${x} after loan day? Paying now would put me in my overdraft before ${loanMonth} 🙏`
          : `I'll sit out ${x}, saving so I'm not in my overdraft before ${loanMonth}. Film night at mine instead? 💛`;
      }
      return pay
        ? `Money's tight till loan day. Could I pay ${x} once my loan lands? 🙏`
        : `Money's tight till loan day, so I'll give ${x} a miss this time. Have the best time! 💛`;
    case "exhausted":
      return pay
        ? `I can't cover ${x} before loan day, sorry. Could we push it back till my loan lands? 💛`
        : `It's a no from me for ${x}, I can't stretch to it before loan day. Have an amazing time though 💛`;
    case "outside-window": {
      const isPast = today !== undefined && dayNumber(plan.date) < dayNumber(today);
      if (isPast) return pay ? `All good, I can sort ${x} 👍` : `Count me in for ${x}! 🙌`;
      return pay
        ? `After loan day? I can pay ${x} then 👍`
        : `After loan day? Count me in for ${x}! 🙌`;
    }
  }
}

/** A tactful reply to send to the group chat for this preview. Always under MAX_REPLY_LENGTH. */
export function replyFor(preview: PlanPreview): string {
  const reply = compose(preview, planPhrase(preview.plan.label));
  if (codePoints(reply) < MAX_REPLY_LENGTH) return reply;
  // A very long plan name: refer to it as "this" so the reply stays chat-sized.
  return compose(preview, "this");
}
