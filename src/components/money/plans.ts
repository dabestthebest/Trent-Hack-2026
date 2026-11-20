import type { Bill, Plan } from "@/lib/money/types";

/** A plan being previewed on the Runway page. `emoji` is display-only and never reaches the engine. */
export interface ActivePlan extends Plan {
  emoji?: string | undefined;
}

export function toPlan(p: Plan): Plan {
  return { label: p.label, amountPence: p.amountPence, date: p.date };
}

export function planKey(p: Plan): string {
  return `${p.label}|${p.amountPence}|${p.date}`;
}

/** True when the plan has already been added as a bill (same label, amount and date). */
export function isPlanInBills(p: Plan, bills: Bill[]): boolean {
  return bills.some(
    (b) => b.label === p.label && b.amountPence === p.amountPence && b.date === p.date,
  );
}
