// Penny's tips. Pure: the runway result in, a mood and one honest sentence out. Every number shown
// comes straight from the engine (exact pence via pounds(), dates via formatDay()).

import { pounds } from "@/lib/dibs/format";
import { formatDay } from "@/lib/money/dates";
import type { PlanPreview, RunwayOk } from "@/lib/money/types";

export type Mood = "happy" | "worried" | "party" | "chill";

export interface Tip {
  mood: Mood;
  text: string;
}

export interface TipInput {
  result: RunwayOk;
  dailySpendPence: number;
  overdraftPence: number;
  /** The plan currently being previewed, if any. */
  preview?: PlanPreview | null | undefined;
}

function dayWord(n: number): string {
  return n === 1 ? "1 more day" : `${n} more days`;
}

function previewTip(preview: PlanPreview): Tip {
  switch (preview.verdict) {
    case "exhausted":
      return {
        mood: "worried",
        text: "That would wipe out your whole overdraft. Skip it or ask for help? 👀",
      };
    case "overdraft": {
      const n = preview.daysEarlierOverdraft;
      if (n !== null && n > 0) {
        return {
          mood: "worried",
          text: `Skipping this keeps your overdraft untouched for ${dayWord(n)}.`,
        };
      }
      const firstDip = preview.after.firstOverdraftDate;
      if (preview.causesOverdraft && firstDip !== null) {
        return {
          mood: "worried",
          text: `This would tip you into your overdraft on ${formatDay(firstDip)}. Skip it and you stay out of it 💚`,
        };
      }
      return { mood: "worried", text: "This digs deeper into your overdraft." };
    }
    case "fine":
      return { mood: "happy", text: "You can afford it AND reach loan day. Go have fun 🎉" };
    case "outside-window":
      return {
        mood: "chill",
        text: "That's after loan day, so it doesn't touch this runway. Future you can decide 😌",
      };
  }
}

/** The single most useful thing Penny can say right now. */
export function tipFor(input: TipInput): Tip {
  const { result, dailySpendPence, preview } = input;
  if (preview) return previewTip(preview);

  if (result.billsAloneOverdraftDate !== null) {
    return {
      mood: "worried",
      text: `Your bills alone sink you on ${formatDay(result.billsAloneOverdraftDate)}. Time to move a bill or ask for backup.`,
    };
  }

  if (result.firstOverdraftDate !== null) {
    const cut = dailySpendPence - result.safeDailyPence;
    // Spending exactly safeDailyPence never takes the balance below £0, so this promise is exact.
    const mood: Mood = result.firstExhaustedDate !== null ? "worried" : "chill";
    if (cut > 0) {
      return {
        mood,
        text: `Spend ${pounds(cut)} less a day and you'll make it to loan day without touching your overdraft.`,
      };
    }
    return {
      mood,
      text: `At your usual spend you'd dip into your overdraft on ${formatDay(result.firstOverdraftDate)}.`,
    };
  }

  return {
    mood: "party",
    text: `You're on track for loan day with ${pounds(result.endBalancePence)} to spare. Main character energy ✨`,
  };
}

/**
 * The main tip first, then a couple of evergreen ones for Penny's "Next tip" button. The extras make
 * no numeric claims beyond what the engine gives.
 */
export function tipsFor(input: TipInput): Tip[] {
  const tips: Tip[] = [tipFor(input)];
  const { result } = input;
  if (!input.preview) {
    tips.push({
      mood: "happy",
      text: `Your safe spend is ${pounds(result.safeDailyPence)} a day, with every bill you've added already counted.`,
    });
  }
  tips.push(
    {
      mood: "chill",
      text: "Before you say yes to a plan, preview it. Ten seconds now saves a scary bank app later 🔮",
    },
    {
      mood: "happy",
      text: "Skipping something? It goes in the jar 🫙. Small skips add up fast.",
    },
    {
      mood: "chill",
      text: "Loan day here is a placeholder. Check your Student Finance date so the maths is real.",
    },
  );
  return tips;
}
