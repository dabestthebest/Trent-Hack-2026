import { CalendarClock, TriangleAlert } from "lucide-react";

import type { RunwayError } from "@/lib/money/types";

interface RunwayProblemProps {
  error: RunwayError;
  onFix: () => void;
}

/** Friendly stand-in for the hero when the engine can't build a runway from the numbers. */
export function RunwayProblem({ error, onFix }: RunwayProblemProps) {
  const loanDay = error.reason === "loan-date-not-after-today";
  const Icon = loanDay ? CalendarClock : TriangleAlert;
  return (
    <section
      aria-labelledby="runway-heading"
      className="rounded-3xl border-2 border-dashed border-primary/40 bg-card p-5 shadow-sm sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Your runway
      </p>
      <h1
        id="runway-heading"
        className="mt-2 flex items-start gap-2.5 font-display text-2xl font-bold leading-tight"
      >
        <Icon className="mt-0.5 h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
        <span>{loanDay ? "When's your next loan payment?" : "Some numbers need a look"}</span>
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed" role="status">
        {loanDay
          ? "Loan day needs to be after today, so there's a runway to count down. Set the next loan date in Your numbers."
          : `${error.message} Check Your numbers below.`}
      </p>
      <button
        type="button"
        onClick={onFix}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 sm:w-auto"
      >
        {loanDay ? "Set the next loan date" : "Check your numbers"}
      </button>
    </section>
  );
}
