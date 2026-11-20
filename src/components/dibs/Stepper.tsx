import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface StepperProps {
  id: string;
  label: string;
  hint?: string | undefined;
  value: number;
  min: number;
  max: number;
  step: number;
  /** How to show the value next to the field, e.g. "+£25". */
  display: (value: number) => string;
  onChange: (value: number) => void;
  error?: string | undefined;
}

export function Stepper({
  id,
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
  error,
}: StepperProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[£\s+]/g, "").replace("−", "-");
    const n = Number(cleaned);
    if (cleaned !== "" && cleaned !== "-" && Number.isFinite(n)) onChange(Math.trunc(n));
  };

  const bump = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    onChange(next);
  };

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium text-foreground">
          {label}
        </label>
        <span
          className="font-display text-lg font-semibold tabular-nums text-primary"
          aria-hidden="true"
        >
          {display(value)}
        </span>
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => bump(-step)}
          disabled={value <= min}
          aria-label={`${label}: decrease by £${step}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            £
          </span>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              commit(e.target.value);
            }}
            onBlur={() => setText(String(value))}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined
            }
            className="h-12 w-full rounded-xl border border-border bg-card pl-7 pr-3 text-center text-lg font-semibold tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
          />
        </div>
        <button
          type="button"
          onClick={() => bump(step)}
          disabled={value >= max}
          aria-label={`${label}: increase by £${step}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
