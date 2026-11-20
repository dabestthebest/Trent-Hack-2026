import {
  ArrowDown,
  CalendarClock,
  Check,
  CircleCheck,
  ClipboardCopy,
  MessageCircle,
  OctagonX,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { pounds } from "@/lib/dibs/format";
import type { ISODate, PlanPreview, Verdict } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import { chipText, previewRows, verdictHeadline } from "./copy";
import { copyToClipboard, scrollIntoViewGently } from "./dom";
import { planKey } from "./plans";
import { FOCUS_RING, TONE_BOX } from "./styles";

export interface PlanPreviewCardProps {
  preview: PlanPreview;
  emoji?: string | undefined;
  reply: string;
  today: ISODate;
  overdraftPence: number;
  alreadySkipped: boolean;
  onGoing: () => void;
  onSkip: () => void;
  onClose: () => void;
  onShowCalendar?: (() => void) | undefined;
}

const VERDICT_STYLE: Record<Verdict, { icon: typeof CircleCheck; band: string; border: string }> = {
  fine: { icon: CircleCheck, band: TONE_BOX.own, border: "border-success/40" },
  overdraft: {
    icon: TriangleAlert,
    band: TONE_BOX.overdraft,
    border: "border-[color:oklch(0.8_0.11_78)]",
  },
  exhausted: { icon: OctagonX, band: TONE_BOX.exhausted, border: "border-destructive/50" },
  "outside-window": {
    icon: CalendarClock,
    band: "bg-secondary text-secondary-foreground",
    border: "border-border",
  },
};

export function PlanPreviewCard({
  preview,
  emoji,
  reply,
  today,
  overdraftPence,
  alreadySkipped,
  onGoing,
  onSkip,
  onClose,
  onShowCalendar,
}: PlanPreviewCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const key = planKey(preview.plan);

  // A new plan: move focus to the verdict so screen readers hear it, and bring the card into view.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    scrollIntoViewGently(cardRef.current, "nearest");
    setCopy("idle");
  }, [key]);

  useEffect(() => {
    if (copy !== "copied") return;
    const t = window.setTimeout(() => setCopy("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [copy]);

  const style = VERDICT_STYLE[preview.verdict];
  const Icon = style.icon;
  const rows = previewRows(preview, overdraftPence);
  const amount = pounds(preview.plan.amountPence);

  const onCopy = async () => {
    const ok = await copyToClipboard(reply);
    setCopy(ok ? "copied" : "failed");
  };

  return (
    <article
      ref={cardRef}
      aria-labelledby="preview-heading"
      data-verdict={preview.verdict}
      className={cn(
        "scroll-mt-20 overflow-hidden rounded-2xl border-2 bg-card shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300",
        style.border,
      )}
    >
      <div className={`flex items-start gap-3 p-4 ${style.band}`}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium opacity-90">{chipText({ ...preview.plan, emoji })}</p>
          <h3
            id="preview-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 flex items-start gap-2 font-display text-2xl font-bold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
            <span>{verdictHeadline(preview, today, overdraftPence)}</span>
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className={cn(
            "-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-card/60",
            FOCUS_RING,
          )}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 p-4 pt-3">
        <dl className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="text-right text-xs font-semibold text-muted-foreground">
                  {row.change}
                </dd>
              </div>
              <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-lg font-semibold tabular-nums">{row.value}</span>
                {row.hint !== null ? (
                  <span className="text-sm text-muted-foreground">{row.hint}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>

        {onShowCalendar ? (
          <button
            type="button"
            onClick={onShowCalendar}
            className={cn(
              "-mx-1 -mt-2 inline-flex min-h-11 items-center gap-1 rounded px-1 text-sm font-semibold text-primary underline-offset-2 hover:underline",
              FOCUS_RING,
            )}
          >
            See it day by day <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        <div>
          <p id="reply-label" className="text-sm font-semibold">
            Reply for the group chat
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <blockquote
              aria-labelledby="reply-label"
              data-testid="reply-text"
              className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3 text-[0.95rem] leading-snug text-secondary-foreground"
            >
              {reply}
            </blockquote>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onCopy}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition hover:bg-secondary/60",
                  FOCUS_RING,
                )}
              >
                {copy === "copied" ? (
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                ) : (
                  <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
                )}
                {copy === "copied" ? "Copied!" : "Copy reply"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(reply)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition hover:bg-secondary/60",
                  FOCUS_RING,
                )}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Open in WhatsApp
                <span className="sr-only">(opens WhatsApp; you choose who to send it to)</span>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Nothing is sent until you choose a chat and press send.
            </p>
            {copy === "failed" ? (
              <p className="text-sm text-destructive">
                Couldn&apos;t copy automatically. Press and hold the reply to copy it.
              </p>
            ) : null}
          </div>
          <p className="sr-only" aria-live="polite">
            {copy === "copied" ? "Reply copied to your clipboard." : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onGoing}
            className="flex h-12 items-center justify-center rounded-xl bg-primary px-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
          >
            I&apos;m going
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={alreadySkipped}
            className={cn(
              "flex h-12 items-center justify-center rounded-xl border border-border bg-card px-3 font-semibold transition hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-60",
              FOCUS_RING,
            )}
          >
            {alreadySkipped ? "Already skipped" : "Skip it"}
          </button>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          {alreadySkipped
            ? `You skipped this. I'm going adds it to your bills and takes ${amount} back out of your jar.`
            : `I'm going adds it to your bills. Skip it puts ${amount} in your jar.`}
        </p>
      </div>
    </article>
  );
}
