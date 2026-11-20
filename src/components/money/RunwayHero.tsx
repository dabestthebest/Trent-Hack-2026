import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CircleCheck,
  Info,
  OctagonX,
  TriangleAlert,
} from "lucide-react";

import { pounds, signedPounds } from "@/lib/dibs/format";
import { NTU_TERM_TWO_START } from "@/lib/money/fixture";
import type { ISODate, RunwayOk } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import { billsAloneLine, daysToLoanPill, paceLine, safeUntilLine } from "./copy";
import { useAnimatedNumber, useRecentChange } from "./hooks";
import { FOCUS_RING, TONE_BOX } from "./styles";

interface RunwayHeroProps {
  result: RunwayOk;
  loanDate: ISODate;
  dailySpendPence: number;
  overdraftPence: number;
  onChangeLoanDay: () => void;
}

/** Size the big number by its final length so it never overflows a 320px phone. */
function bigNumberSize(text: string): string {
  if (text.length <= 5) return "text-[length:clamp(3.5rem,19vw,6.5rem)]";
  if (text.length === 6) return "text-[length:clamp(3rem,15.5vw,5.75rem)]";
  if (text.length === 7) return "text-[length:clamp(2.5rem,13vw,5rem)]";
  return "text-[length:clamp(2.25rem,10.5vw,4.25rem)]";
}

const PACE_ICON = { own: CircleCheck, overdraft: TriangleAlert, exhausted: OctagonX } as const;

export function RunwayHero({
  result,
  loanDate,
  dailySpendPence,
  overdraftPence,
  onChangeLoanDay,
}: RunwayHeroProps) {
  const safe = result.safeDailyPence;
  const shown = useAnimatedNumber(safe);
  const change = useRecentChange(safe);
  const pace = paceLine(result, dailySpendPence, overdraftPence);
  const tone = TONE_BOX[pace.tone];
  const PaceIcon = PACE_ICON[pace.tone];

  return (
    <section aria-labelledby="runway-heading" className="space-y-2">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-accent/30 blur-3xl"
        />

        <h1
          id="runway-heading"
          className="relative text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        >
          Your runway
        </h1>

        <p className="relative mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span
            data-testid="safe-per-day"
            className={cn(
              "font-display font-extrabold leading-[0.95] tracking-tight tabular-nums text-foreground",
              bigNumberSize(pounds(safe)),
            )}
          >
            {pounds(shown)}
          </span>
          <span className="font-display text-2xl font-semibold text-muted-foreground">a day</span>
          {change !== null ? <DeltaPill key={change.seq} delta={change.delta} /> : null}
        </p>

        <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-base font-medium leading-snug min-[360px]:text-lg">
            {safeUntilLine(loanDate)}
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {daysToLoanPill(result.days)}
          </p>
        </div>

        <p
          className={`relative mt-4 flex items-start gap-2.5 rounded-2xl p-3 text-[0.95rem] font-medium leading-snug ${tone}`}
        >
          <PaceIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{pace.text}</span>
        </p>

        {result.billsAloneOverdraftDate !== null ? (
          <p className="relative mt-2 flex items-start gap-2.5 rounded-2xl border-2 border-destructive/40 bg-card/80 p-3 text-[0.95rem] font-semibold leading-snug">
            <TriangleAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <span>{billsAloneLine(result.billsAloneOverdraftDate)}</span>
          </p>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {change !== null ? `Safe to spend is now ${pounds(safe)} a day.` : ""}
        </p>
      </div>

      <div className="flex items-start gap-2 px-1 text-sm leading-relaxed text-muted-foreground">
        <Info className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span>
            {loanDate === NTU_TERM_TWO_START
              ? "Estimated loan day: NTU's Term Two start. Check your Student Finance England account for your payment date."
              : "Check your Student Finance England account for your payment date."}
          </span>{" "}
          <button
            type="button"
            onClick={onChangeLoanDay}
            className={cn(
              "rounded px-0.5 py-1 font-semibold text-foreground underline underline-offset-2 hover:text-primary",
              FOCUS_RING,
            )}
          >
            Change loan day
          </button>
        </p>
      </div>
    </section>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const up = delta > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center gap-0.5 self-center rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
        up ? "bg-success-soft text-success-strong" : "bg-warning-soft text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {signedPounds(delta)}
    </span>
  );
}
