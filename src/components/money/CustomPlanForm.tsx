import { useEffect, useRef, useState, type FormEvent } from "react";

import { addDays } from "@/lib/money/dates";
import type { ISODate } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import { Field } from "./fields";
import { LABEL_MAX, parseDate, parseLabel, parsePounds } from "./parse";
import type { ActivePlan } from "./plans";
import { FOCUS_RING } from "./styles";

interface CustomPlanFormProps {
  id: string;
  today: ISODate;
  onSubmit: (plan: ActivePlan) => void;
  onCancel: () => void;
}

interface Errors {
  label: string | null;
  amount: string | null;
  date: string | null;
}

const NO_ERRORS: Errors = { label: null, amount: null, date: null };

export function CustomPlanForm({ id, today, onSubmit, onCancel }: CustomPlanFormProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => addDays(today, 7));
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [tried, setTried] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    labelRef.current?.focus();
  }, []);

  const check = (l: string, a: string, d: string) => {
    const pl = parseLabel(l);
    const pa = parsePounds(a, { allowZero: false, emptyMessage: "Enter how much it costs." });
    const pd = parseDate(d, { min: today, minMessage: "Pick today or a later date." });
    return {
      pl,
      pa,
      pd,
      errors: {
        label: pl.ok ? null : pl.error,
        amount: pa.ok ? null : pa.error,
        date: pd.ok ? null : pd.error,
      },
    };
  };

  // Once they've tried to submit, keep the messages in step with what they type.
  const revalidate = (l: string, a: string, d: string) => {
    if (tried) setErrors(check(l, a, d).errors);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const { pl, pa, pd, errors: next } = check(label, amount, date);
    setErrors(next);
    if (pl.ok && pa.ok && pd.ok) {
      onSubmit({ label: pl.value, amountPence: pa.value, date: pd.value });
      return;
    }
    if (!pl.ok) labelRef.current?.focus();
    else if (!pa.ok) amountRef.current?.focus();
    else dateRef.current?.focus();
  };

  return (
    <form
      id={id}
      onSubmit={submit}
      noValidate
      aria-label="Check something else"
      className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
    >
      <Field
        label="What is it?"
        inputRef={labelRef}
        value={label}
        maxLength={LABEL_MAX + 10}
        autoComplete="off"
        placeholder="Gig tickets"
        error={errors.label}
        onChange={(e) => {
          setLabel(e.target.value);
          revalidate(e.target.value, amount, date);
        }}
      />
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <Field
          label="How much?"
          prefix="£"
          inputRef={amountRef}
          value={amount}
          inputMode="decimal"
          autoComplete="off"
          placeholder="30.00"
          error={errors.amount}
          onChange={(e) => {
            setAmount(e.target.value);
            revalidate(label, e.target.value, date);
          }}
        />
        <Field
          label="When?"
          type="date"
          inputRef={dateRef}
          value={date}
          min={today}
          error={errors.date}
          onChange={(e) => {
            setDate(e.target.value);
            revalidate(label, amount, e.target.value);
          }}
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          See what it does
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "flex h-12 items-center justify-center rounded-xl px-4 font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground",
            FOCUS_RING,
          )}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
