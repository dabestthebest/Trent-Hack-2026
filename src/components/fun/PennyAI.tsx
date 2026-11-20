import { Loader2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useRef, useState } from "react";

import { getPennyAdviceWithAI } from "@/lib/ai/penny-advice";
import { keepGroundedTips, pennySummary } from "@/lib/fun/pennyAi";
import { tipFor } from "@/lib/fun/tips";
import type { PlanPreview, RunwayInput, RunwayOk } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import { CoinMascot } from "./CoinMascot";

const AI_TIMEOUT_MS = 6000;

interface PennyAIProps {
  input: RunwayInput;
  result: RunwayOk;
  preview: PlanPreview | null;
  className?: string | undefined;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "tips"; tips: string[] }
  | { kind: "fallback"; tip: string };

/** "Ask Penny AI": a short money check of the numbers on screen, with a rule-based fallback. */
export function PennyAI({ input, result, preview, className }: PennyAIProps) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const cache = useRef(new Map<string, string[]>());

  const ask = async () => {
    const summary = pennySummary(input, result, preview);
    const key = JSON.stringify(summary);
    const cached = cache.current.get(key);
    if (cached) {
      setState({ kind: "tips", tips: cached });
      return;
    }
    setState({ kind: "loading" });
    const fallback = () =>
      setState({
        kind: "fallback",
        tip: tipFor({
          result,
          dailySpendPence: input.dailySpendPence,
          overdraftPence: input.overdraftPence,
          preview,
        }).text,
      });
    // Offline (eduroam dropped out): skip straight to Penny's own tip instead of waiting.
    if (typeof navigator !== "undefined" && navigator.onLine === false) return fallback();
    try {
      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), AI_TIMEOUT_MS),
      );
      const res = await Promise.race([getPennyAdviceWithAI({ data: summary }), timeout]);
      if (res === null || !res.ok) return fallback();
      const tips = keepGroundedTips(res.tips, summary);
      if (tips.length === 0) return fallback();
      cache.current.set(key, tips);
      setState({ kind: "tips", tips });
    } catch {
      fallback();
    }
  };

  const loading = state.kind === "loading";

  return (
    <section
      aria-labelledby="penny-ai-heading"
      className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm", className)}
    >
      <div className="flex items-center gap-3">
        <CoinMascot mood={state.kind === "tips" ? "party" : "chill"} size={44} animate={loading} />
        <div className="min-w-0">
          <h2 id="penny-ai-heading" className="font-display text-lg font-semibold leading-tight">
            Ask Penny AI
          </h2>
          <p className="text-sm text-muted-foreground">
            A quick money check of the numbers on this page.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={ask}
        disabled={loading}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : state.kind === "idle" ? (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        )}
        {loading
          ? "Penny is crunching your numbers…"
          : state.kind === "idle"
            ? "Review my money"
            : "Ask again"}
      </button>

      <div aria-live="polite" className="mt-3 space-y-2">
        {state.kind === "tips" ? (
          <>
            <ul className="space-y-2">
              {state.tips.map((t, i) => (
                <li key={i} className="rounded-xl bg-secondary/70 px-3 py-2 text-sm leading-snug">
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Written by AI from your numbers. Any tip with a £ figure that isn&apos;t in your
              numbers is dropped, but double-check before acting on it.
            </p>
          </>
        ) : null}
        {state.kind === "fallback" ? (
          <p className="rounded-xl bg-secondary/70 px-3 py-2 text-sm leading-snug">
            <span className="font-semibold">
              Penny AI is having a nap, so here&apos;s my usual tip:{" "}
            </span>
            {state.tip}
          </p>
        ) : null}
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Only the amounts, dates and item names on this page go to the AI. No bank login, nothing
        saved.
      </p>
    </section>
  );
}
