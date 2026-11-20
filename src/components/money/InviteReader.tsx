import {
  Bot,
  Check,
  ClipboardPaste,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useId, useState } from "react";

import { parseInviteWithAI } from "@/lib/ai/parse-invite";
import { formatDay } from "@/lib/money/dates";
import { parseInviteLocal, sanitiseInvite, type ParsedInvite } from "@/lib/money/invite";
import type { ISODate, Plan } from "@/lib/money/types";

const EXAMPLE = "winter ball tickets are £55, need names by fri, it's on fri 4th dec!!";
const AI_TIMEOUT_MS = 8000;

type Source = "ai" | "device";

interface InviteReaderProps {
  today: ISODate;
  /** Called after the student has checked the fields and tapped Preview. */
  onPlanReady: (plan: Plan, source: Source) => void;
}

interface Draft {
  label: string;
  amount: string;
  date: string;
  source: Source;
  lowConfidence: boolean;
  note: string | null;
}

function penceToField(p: number | null): string {
  return p === null ? "" : (p / 100).toFixed(2);
}

/** "£12.50" / "12.5" / "12" → 1250. Returns null for anything else. */
function fieldToPence(raw: string): number | null {
  const s = raw.replace(/[£,\s]/g, "");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const pence = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return pence > 0 && pence <= 1_000_000 ? pence : null;
}

async function readWithAI(
  text: string,
  today: ISODate,
): Promise<{ parsed: ParsedInvite; low: boolean } | null> {
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS));
    const call = parseInviteWithAI({ data: { text, today } });
    const res = await Promise.race([call, timeout]);
    if (res === null || !res.ok) return null;
    return {
      parsed: sanitiseInvite(
        { label: res.label, amountPence: res.amountPence, date: res.date },
        today,
      ),
      low: res.confidence === "low",
    };
  } catch {
    return null;
  }
}

export function InviteReader({ today, onPlanReady }: InviteReaderProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = async () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setError("Paste a message first.");
      return;
    }
    setError(null);
    setReading(true);
    const local = sanitiseInvite(parseInviteLocal(trimmed, today), today);
    const ai = await readWithAI(trimmed.slice(0, 1000), today);
    setReading(false);

    // Prefer the AI's reading; fill any gaps from the on-device reader.
    const merged: ParsedInvite = ai
      ? {
          label: ai.parsed.label ?? local.label,
          amountPence: ai.parsed.amountPence ?? local.amountPence,
          date: ai.parsed.date ?? local.date,
        }
      : local;
    const source: Source = ai ? "ai" : "device";
    const missing = [
      merged.amountPence === null ? "the cost" : null,
      merged.date === null ? "the date" : null,
    ].filter(Boolean);
    setDraft({
      label: merged.label ?? "Plan",
      amount: penceToField(merged.amountPence),
      date: merged.date ?? "",
      source,
      lowConfidence: ai?.low ?? false,
      note: missing.length > 0 ? `Couldn't find ${missing.join(" or ")}. Add it below.` : null,
    });
  };

  const amountPence = draft ? fieldToPence(draft.amount) : null;
  const dateOk = draft ? /^\d{4}-\d{2}-\d{2}$/.test(draft.date) && draft.date >= today : false;
  const labelOk = draft ? draft.label.trim().length > 0 && draft.label.trim().length <= 40 : false;
  const canPreview = draft !== null && amountPence !== null && dateOk && labelOk;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/60"
          aria-hidden="true"
        >
          <ClipboardPaste className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">
            Got an invite? Paste it.
          </h3>
          <p className="text-sm text-muted-foreground">
            We&apos;ll read the cost and date, then you check them.
          </p>
        </div>
      </div>

      <label htmlFor={`${id}-text`} className="sr-only">
        Group chat message
      </label>
      <textarea
        id={`${id}-text`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder={EXAMPLE}
        className="w-full resize-none rounded-xl border border-border bg-background p-3 text-base leading-snug placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={read}
          disabled={reading}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:opacity-60"
        >
          {reading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {reading ? "Reading…" : "Read it"}
        </button>
        <button
          type="button"
          onClick={() => {
            setText(EXAMPLE);
            setDraft(null);
            setError(null);
          }}
          className="h-11 rounded-xl px-3 text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try an example
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Your message goes to an AI model only to read the cost and date. Nothing is stored, and
        nothing is sent anywhere without you.
      </p>

      {draft ? (
        <form
          aria-label="Check what we read"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canPreview || amountPence === null) return;
            onPlanReady({ label: draft.label.trim(), amountPence, date: draft.date }, draft.source);
          }}
          className="space-y-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3"
        >
          <p className="flex items-center gap-2 text-sm font-semibold" role="status">
            {draft.source === "ai" ? (
              <>
                <Bot className="h-4 w-4" aria-hidden="true" /> Read by AI. Check it before we run
                it.
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4" aria-hidden="true" /> Read on your phone (AI
                unavailable). Check it.
              </>
            )}
          </p>
          {draft.lowConfidence ? (
            <p className="text-sm text-muted-foreground">
              The AI wasn&apos;t sure about this one, so double-check.
            </p>
          ) : null}
          {draft.note ? <p className="text-sm font-medium text-destructive">{draft.note}</p> : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem_10rem]">
            <label className="space-y-1 text-sm font-medium">
              <span>What</span>
              <input
                value={draft.label}
                maxLength={40}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>Cost (£)</span>
              <input
                value={draft.amount}
                inputMode="decimal"
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                aria-invalid={draft.amount !== "" && amountPence === null ? true : undefined}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>When</span>
              <input
                type="date"
                value={draft.date}
                min={today}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
          {dateOk ? (
            <p className="text-xs text-muted-foreground">That&apos;s {formatDay(draft.date)}.</p>
          ) : null}
          <button
            type="submit"
            disabled={!canPreview}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" /> Looks right, preview it
          </button>
        </form>
      ) : null}
    </div>
  );
}
