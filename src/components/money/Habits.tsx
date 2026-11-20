import { Bot, Check, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { pounds } from "@/lib/dibs/format";
import { predictHabitsWithAI } from "@/lib/ai/predict-habits";
import {
  HABIT_EXAMPLE,
  HABIT_QUICK_ADDS,
  MAX_TIMES,
  MIN_TIMES,
  clampHabit,
  dailyPence,
  weeklyPence,
  type Habit,
} from "@/lib/money/habits";
import { useMoney } from "@/lib/money/store";
import { cn } from "@/lib/utils";

const AI_TIMEOUT_MS = 6000;
let habitCounter = 0;
const newId = () => `habit-${++habitCounter}`;

/** "12" / "£12.50" -> pence, or null. */
function toPence(raw: string): number | null {
  const s = raw.replace(/[£,\s]/g, "");
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  return Number(w) * 100 + Number(f.padEnd(2, "0"));
}

interface Row extends Habit {
  costText: string;
  timesText: string;
}

const toRow = (h: Habit): Row => ({
  ...h,
  costText: h.costPence > 0 ? (h.costPence / 100).toFixed(2) : "",
  timesText: String(h.timesPerWeek),
});

/** "Predict my everyday spending": AI turns described habits into a weekly estimate you check. */
export function Habits() {
  const { settings, updateSettings } = useMoney();
  const id = useId();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ai" | "manual">("idle");
  const [notice, setNotice] = useState<string | null>(null);

  const habits: Habit[] = rows.flatMap((r) => {
    const cost = toPence(r.costText);
    const times = Number(r.timesText);
    if (cost === null || !Number.isFinite(times) || times < MIN_TIMES || times > MAX_TIMES)
      return [];
    return [clampHabit({ ...r, costPence: cost, timesPerWeek: times })];
  });
  const weekly = weeklyPence(habits);
  const daily = dailyPence(habits);
  const invalidRows = rows.length - habits.length;

  const predict = async () => {
    const t = text.trim();
    setNotice(null);
    if (t.length === 0) {
      setNotice("Describe your habits first, or add them by hand below.");
      return;
    }
    // Campus Wi-Fi dropped out: go straight to adding habits by hand.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("manual");
      return;
    }
    setStatus("loading");
    try {
      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), AI_TIMEOUT_MS),
      );
      const res = await Promise.race([
        predictHabitsWithAI({ data: { text: t.slice(0, 600) } }),
        timeout,
      ]);
      if (res === null || !res.ok || res.habits.length === 0) {
        setStatus("manual");
        return;
      }
      setRows(res.habits.slice(0, 8).map((h) => toRow(clampHabit({ ...h, id: newId() }))));
      setStatus("ai");
    } catch {
      setStatus("manual");
    }
  };

  const addRow = (label: string) => {
    setRows((rs) => [
      ...rs,
      toRow({ id: newId(), label, timesPerWeek: 1, costPence: 0, estimated: false }),
    ]);
    if (status === "idle") setStatus("manual");
  };

  const setRow = (rowId: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, ...patch, estimated: false } : r)));

  const apply = () => {
    if (habits.length === 0 || daily <= 0) return;
    updateSettings({ dailySpendPence: daily });
    setNotice(`✓ Your usual spend is now ${pounds(daily)} a day, and your runway has updated.`);
  };

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div>
        <h2 id={`${id}-heading`} className="font-display text-xl font-semibold">
          🔮 Predict my everyday spending
        </h2>
        <p className="text-sm text-muted-foreground">
          Eating out, the bus, coffee: describe your habits and AI turns them into a weekly
          estimate. You check it before anything changes.
        </p>
      </div>

      <label htmlFor={`${id}-text`} className="sr-only">
        Your habits
      </label>
      <textarea
        id={`${id}-text`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={600}
        placeholder={HABIT_EXAMPLE}
        className="w-full resize-none rounded-xl border border-border bg-background p-3 text-base leading-snug placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={predict}
          disabled={status === "loading"}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {status === "loading" ? "Predicting…" : "Predict"}
        </button>
        <button
          type="button"
          onClick={() => setText(HABIT_EXAMPLE)}
          className="h-11 rounded-xl px-3 text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try an example
        </button>
      </div>

      <div aria-live="polite" className="space-y-2">
        {status === "ai" ? (
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="h-4 w-4" aria-hidden="true" /> AI&apos;s prediction. Edit anything
            that&apos;s off.
          </p>
        ) : null}
        {status === "manual" ? (
          <p className="text-sm font-semibold">
            AI isn&apos;t available right now, so add your habits by hand.
          </p>
        ) : null}
        {notice ? <p className="text-sm font-medium text-success-strong">{notice}</p> : null}
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-2" aria-label="Your habits">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center gap-2">
                <input
                  aria-label="Habit"
                  value={r.label}
                  maxLength={30}
                  onChange={(e) => setRow(r.id, { label: e.target.value })}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-2 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  aria-label={`Remove ${r.label}`}
                  onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="space-y-1 text-xs font-medium text-muted-foreground">
                  <span>Times a week</span>
                  <input
                    inputMode="decimal"
                    value={r.timesText}
                    onChange={(e) => setRow(r.id, { timesText: e.target.value })}
                    className="h-10 w-full rounded-lg border border-border bg-card px-2 text-base tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium text-muted-foreground">
                  <span>£ each time{r.estimated ? " (AI estimate)" : ""}</span>
                  <input
                    inputMode="decimal"
                    value={r.costText}
                    placeholder="0.00"
                    onChange={(e) => setRow(r.id, { costText: e.target.value })}
                    className="h-10 w-full rounded-lg border border-border bg-card px-2 text-base tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2" aria-label="Add a habit by hand">
        {HABIT_QUICK_ADDS.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => addRow(q.label)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span aria-hidden="true">{q.emoji}</span> {q.label}
          </button>
        ))}
      </div>

      {rows.length > 0 ? (
        <div className="space-y-2 rounded-xl bg-secondary/60 p-3">
          <p className="font-display text-lg font-semibold tabular-nums">
            ≈ {pounds(weekly)} a week · {pounds(daily)} a day
          </p>
          <p className="text-xs text-muted-foreground">
            {invalidRows > 0
              ? `${invalidRows} habit${invalidRows === 1 ? "" : "s"} still need a valid number of times (0.25–21) and a price.`
              : `Your usual daily spend is set to ${pounds(settings?.dailySpendPence ?? 0)}.`}
          </p>
          <button
            type="button"
            onClick={apply}
            disabled={habits.length === 0 || daily <= 0}
            className={cn(
              "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 font-semibold text-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:opacity-50",
            )}
          >
            <Check className="h-4 w-4" aria-hidden="true" /> Use {pounds(daily)} a day as my usual
            spend
          </button>
        </div>
      ) : null}
    </section>
  );
}
