// Everyday "random" spending as habits (eating out, the bus, coffee): how often and how much each
// time, turned into a weekly total and a usual daily spend. Pure, so it is easy to test.

export interface Habit {
  id: string;
  label: string;
  /** 0.25 (about monthly) to 21 (three times a day). */
  timesPerWeek: number;
  /** Cost each time, whole pence. */
  costPence: number;
  /** True when the AI guessed the price rather than the student giving it. */
  estimated: boolean;
}

export const MIN_TIMES = 0.25;
export const MAX_TIMES = 21;
export const MAX_COST_PENCE = 10_000;

export function clampHabit(h: Habit): Habit {
  const times = Number.isFinite(h.timesPerWeek) ? h.timesPerWeek : 0;
  const cost = Number.isFinite(h.costPence) ? Math.round(h.costPence) : 0;
  return {
    ...h,
    label: h.label.trim().slice(0, 30) || "Habit",
    timesPerWeek: Math.min(MAX_TIMES, Math.max(MIN_TIMES, times)),
    costPence: Math.min(MAX_COST_PENCE, Math.max(0, cost)),
  };
}

/** Weekly total in whole pence. */
export function weeklyPence(habits: readonly Habit[]): number {
  return Math.round(habits.reduce((s, h) => s + h.timesPerWeek * h.costPence, 0));
}

/** The usual daily spend these habits imply, in whole pence (rounded up, so it's never too low). */
export function dailyPence(habits: readonly Habit[]): number {
  return Math.ceil(weeklyPence(habits) / 7);
}

/** "2× a week", "most days (5×)", "every day". */
export function timesLabel(times: number): string {
  if (times === 7) return "every day";
  if (times === 1) return "once a week";
  if (times === 0.5) return "every 2 weeks";
  if (times === 0.25) return "about monthly";
  const n = Number.isInteger(times) ? String(times) : times.toFixed(1);
  return `${n}× a week`;
}

export const HABIT_EXAMPLE =
  "eat out about twice a week usually £12, bus to campus 4 days a week, coffee most mornings, a takeaway on fridays";

/** Labels for adding habits by hand (no prices: the student fills those in). */
export const HABIT_QUICK_ADDS = [
  { emoji: "🍔", label: "Eating out" },
  { emoji: "🚌", label: "Bus" },
  { emoji: "☕", label: "Coffee" },
  { emoji: "🍕", label: "Takeaway" },
  { emoji: "🍻", label: "Night out" },
] as const;
