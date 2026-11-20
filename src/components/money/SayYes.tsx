import { Check } from "lucide-react";
import { useId, useMemo, useState, type Ref, type RefObject } from "react";

import { demoPlans } from "@/lib/money/fixture";
import { replyFor } from "@/lib/money/reply";
import type { Bill, ISODate, PlanPreview } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import { chipText, jarLine } from "./copy";
import { CustomPlanForm } from "./CustomPlanForm";
import { InviteReader } from "./InviteReader";
import { PlanPreviewCard } from "./PlanPreviewCard";
import { isPlanInBills, planKey, type ActivePlan } from "./plans";
import { FOCUS_RING } from "./styles";

interface SayYesProps {
  today: ISODate;
  bills: Bill[];
  overdraftPence: number;
  activePlan: ActivePlan | null;
  preview: PlanPreview | null;
  /** Plans skipped this visit, by planKey. */
  skipped: ReadonlyMap<string, number>;
  skippedPence: number;
  /** Latest "added" / "skipped" confirmation, announced politely. */
  notice: string | null;
  onPreview: (plan: ActivePlan) => void;
  onClose: () => void;
  onGoing: () => void;
  onSkip: () => void;
  onShowCalendar: () => void;
  sectionRef: Ref<HTMLElement>;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

const CHIP =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 text-left text-sm font-medium transition";

export function SayYes({
  today,
  bills,
  overdraftPence,
  activePlan,
  preview,
  skipped,
  skippedPence,
  notice,
  onPreview,
  onClose,
  onGoing,
  onSkip,
  onShowCalendar,
  sectionRef,
  headingRef,
}: SayYesProps) {
  const formId = useId();
  const [formOpen, setFormOpen] = useState(false);
  const plans = useMemo(() => demoPlans(today), [today]);
  const activeKey = activePlan ? planKey(activePlan) : null;
  const reply = useMemo(() => (preview ? replyFor(preview) : ""), [preview]);

  return (
    <section ref={sectionRef} aria-labelledby="say-yes-heading" className="scroll-mt-20 space-y-3">
      <div>
        <h2
          id="say-yes-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl font-bold tracking-tight focus:outline-none"
        >
          Can I say yes?
        </h2>
        <p className="mt-0.5 text-muted-foreground">
          Tap a plan to see what it does before you commit.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Plans to check">
        {plans.map((p) => {
          const key = planKey(p);
          const going = isPlanInBills(p, bills);
          const active = key === activeKey;
          const wasSkipped = skipped.has(key);
          return (
            <li key={key}>
              <button
                type="button"
                aria-pressed={active}
                disabled={going}
                onClick={() => {
                  setFormOpen(false);
                  if (active) onClose();
                  else onPreview(p);
                }}
                className={cn(
                  CHIP,
                  FOCUS_RING,
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card hover:border-primary/50 hover:bg-secondary/60",
                  going && "cursor-not-allowed border-dashed bg-transparent opacity-75",
                )}
              >
                <span>{chipText(p)}</span>
                {going ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-xs font-semibold text-success-strong">
                    <Check className="h-3 w-3" aria-hidden="true" /> Going
                  </span>
                ) : wasSkipped ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                      active ? "bg-primary-foreground/20" : "bg-secondary",
                    )}
                  >
                    Skipped
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-expanded={formOpen}
            aria-controls={formOpen ? formId : undefined}
            onClick={() => setFormOpen((o) => !o)}
            className={cn(
              CHIP,
              FOCUS_RING,
              "border-dashed border-primary/60 bg-card text-primary hover:bg-primary/5",
              formOpen && "border-solid bg-primary/10",
            )}
          >
            + Something else
          </button>
        </li>
      </ul>

      {formOpen ? (
        <CustomPlanForm
          id={formId}
          today={today}
          onCancel={() => setFormOpen(false)}
          onSubmit={(plan) => {
            setFormOpen(false);
            onPreview(plan);
          }}
        />
      ) : null}

      <InviteReader
        today={today}
        onPlanReady={(plan) => {
          setFormOpen(false);
          onPreview(plan);
        }}
      />

      {skippedPence > 0 ? (
        <p className="inline-flex items-center rounded-full bg-success-soft px-3 py-1.5 text-sm font-semibold text-success-strong">
          {jarLine(skippedPence)}
        </p>
      ) : null}

      <p
        role="status"
        className={cn("text-sm font-medium text-success-strong", notice === null && "sr-only")}
      >
        {notice ?? ""}
      </p>

      {preview !== null ? (
        <PlanPreviewCard
          preview={preview}
          emoji={activePlan?.emoji}
          reply={reply}
          today={today}
          overdraftPence={overdraftPence}
          alreadySkipped={skipped.has(planKey(preview.plan))}
          onGoing={onGoing}
          onSkip={onSkip}
          onClose={onClose}
          onShowCalendar={onShowCalendar}
        />
      ) : null}
    </section>
  );
}
