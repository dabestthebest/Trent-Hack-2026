// Penny's tip card: the mascot plus a speech bubble. The tip is real text (role="note"); Penny herself
// is decorative. With more than one tip, a "Next tip" button cycles through them.

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import type { Tip } from "@/lib/fun/tips";
import { cn } from "@/lib/utils";

import { CoinMascot } from "./CoinMascot";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export interface PennyTipProps {
  /** The main tip first (from tipsFor() or [tipFor()]). An empty list renders nothing. */
  tips: readonly Tip[];
  className?: string | undefined;
}

export function PennyTip({ tips, className }: PennyTipProps) {
  const lead = tips[0]?.text ?? "";
  // Start again from the main tip whenever it changes (e.g. a plan preview opens).
  const [pos, setPos] = useState<{ lead: string; index: number }>({ lead, index: 0 });
  const [announce, setAnnounce] = useState(false);
  const index = pos.lead === lead ? pos.index : 0;
  const tip = tips[index] ?? tips[0];
  if (tip === undefined) return null;

  const next = () => {
    setAnnounce(true);
    setPos({ lead, index: (index + 1) % tips.length });
  };

  return (
    <section
      aria-label="Penny's tip"
      className={cn(
        "flex items-end gap-2.5 rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:gap-3 sm:p-4",
        className,
      )}
    >
      <CoinMascot mood={tip.mood} size={64} className="mb-1 shrink-0" />
      <div className="relative min-w-0 flex-1">
        {/* Bubble tail pointing at Penny. */}
        <span
          aria-hidden="true"
          className="absolute -left-1.5 bottom-4 h-3.5 w-3.5 rotate-45 rounded-[3px] bg-secondary"
        />
        <div role="note" className="relative rounded-2xl bg-secondary px-3.5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Penny&apos;s tip
          </p>
          <p
            aria-live={announce ? "polite" : "off"}
            className="mt-1 text-[15px] font-medium leading-snug text-secondary-foreground"
          >
            {tip.text}
          </p>
        </div>
        {tips.length > 1 ? (
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={next}
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:underline",
                FOCUS_RING,
              )}
            >
              Next tip
              <span className="sr-only">
                {" "}
                ({index + 1} of {tips.length})
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
