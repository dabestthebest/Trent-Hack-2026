// "Money coming in": part-time shifts, paydays and one-off money (the student's own estimate). Each
// item can repeat; the store expands it over the runway, so the hero and calendar update straight away.

import { Plus, Trash2, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type Ref,
} from "react";

import { pounds } from "@/lib/dibs/format";
import { addDays, formatDay, weekday } from "@/lib/money/dates";
import { expandRecurring, type Frequency, type RecurringItem } from "@/lib/money/recurring";
import { useMoney } from "@/lib/money/store";
import type { ISODate } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import { Field, INPUT_CLASS } from "./fields";
import { LABEL_MAX, parseDate, parseLabel, parsePounds } from "./parse";
import { FOCUS_RING } from "./styles";

// ---------- shared bits (also used by Subscriptions) ----------

export const CHIP_CLASS = cn(
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-left text-sm font-medium transition hover:border-primary/50 hover:bg-secondary/60",
  FOCUS_RING,
);

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Remove ${label}`}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-warning-soft hover:text-destructive",
        FOCUS_RING,
      )}
    >
      <Trash2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export function MoneyCard({
  headingId,
  headingRef,
  title,
  hint,
  children,
}: {
  headingId: string;
  /** Focus lands here after adding or removing, so it is never lost when a row or form unmounts. */
  headingRef: Ref<HTMLHeadingElement>;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="scroll-mt-20 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-xl font-semibold focus:outline-none"
      >
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {children}
    </section>
  );
}

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "once", label: "One-off" },
  { value: "weekly", label: "Every week" },
  { value: "fortnightly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every month" },
];

const FREQUENCY_PHRASE: Record<Exclude<Frequency, "once">, string> = {
  weekly: "every week",
  fortnightly: "every 2 weeks",
  monthly: "every month",
};

/** "£60.00 every week from Sat 21 Nov" / "£50.00 on Tue 1 Dec". */
function incomeLine(item: Pick<RecurringItem, "amountPence" | "firstDate" | "frequency">) {
  const amount = pounds(item.amountPence);
  if (item.frequency === "once") return `${amount} on ${formatDay(item.firstDate)}`;
  return `${amount} ${FREQUENCY_PHRASE[item.frequency]} from ${formatDay(item.firstDate)}`;
}

/** The first Saturday on or after `today`. */
function nextSaturday(today: ISODate): ISODate {
  return addDays(today, (6 - weekday(today) + 7) % 7);
}

interface FormErrors {
  label: string | null;
  amount: string | null;
  date: string | null;
}

const NO_ERRORS: FormErrors = { label: null, amount: null, date: null };

export interface RecurringFormProps {
  today: ISODate;
  ariaLabel: string;
  title: string;
  submitText: string;
  amountLabel: string;
  dateLabel: string;
  amountPlaceholder: string;
  labelPlaceholder: string;
  initialLabel: string;
  initialDate: ISODate;
  initialFrequency: Frequency;
  /** Show the "How often" select; when false the frequency stays at initialFrequency. */
  chooseFrequency: boolean;
  /** Which field to focus when the form opens. */
  focus: "label" | "amount";
  onSubmit: (item: Omit<RecurringItem, "id">) => void;
  onCancel: () => void;
}

export function RecurringForm(p: RecurringFormProps) {
  const selectId = useId();
  const [label, setLabel] = useState(p.initialLabel);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(p.initialDate);
  const [frequency, setFrequency] = useState<Frequency>(p.initialFrequency);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const labelRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (p.focus === "amount" ? amountRef : labelRef).current?.focus();
    // Only when the form first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const pl = parseLabel(label);
    const pa = parsePounds(amount, { allowZero: false, emptyMessage: "Enter how much it is." });
    const pd = parseDate(date, { min: p.today, minMessage: "Pick today or a later date." });
    setErrors({
      label: pl.ok ? null : pl.error,
      amount: pa.ok ? null : pa.error,
      date: pd.ok ? null : pd.error,
    });
    if (!pl.ok || !pa.ok || !pd.ok) {
      (!pl.ok ? labelRef : !pa.ok ? amountRef : dateRef).current?.focus();
      return;
    }
    p.onSubmit({ label: pl.value, amountPence: pa.value, firstDate: pd.value, frequency });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={p.ariaLabel}
      className="mt-3 space-y-3 rounded-2xl border border-dashed border-border bg-background/60 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{p.title}</p>
        <button
          type="button"
          onClick={p.onCancel}
          aria-label="Cancel"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary",
            FOCUS_RING,
          )}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <Field
        label="What"
        inputRef={labelRef}
        value={label}
        maxLength={LABEL_MAX + 10}
        autoComplete="off"
        placeholder={p.labelPlaceholder}
        error={errors.label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <Field
          label={p.amountLabel}
          prefix="£"
          inputRef={amountRef}
          inputMode="decimal"
          autoComplete="off"
          placeholder={p.amountPlaceholder}
          value={amount}
          error={errors.amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Field
          label={frequency === "once" ? "Date" : p.dateLabel}
          type="date"
          inputRef={dateRef}
          min={p.today}
          value={date}
          error={errors.date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {p.chooseFrequency ? (
        <div className="min-w-0">
          <label htmlFor={selectId} className="block text-sm font-semibold text-foreground">
            How often
          </label>
          <select
            id={selectId}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            className={cn(INPUT_CLASS, "mt-1.5")}
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <button
        type="submit"
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 font-semibold text-secondary-foreground hover:brightness-95",
          FOCUS_RING,
        )}
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> {p.submitText}
      </button>
    </form>
  );
}

// ---------- the card ----------

interface FormState {
  key: number;
  frequency: Frequency;
}

export function MoneyIn() {
  const { today, settings, runwayInput, addIncome, removeIncome } = useMoney();
  const [form, setForm] = useState<FormState | null>(null);
  const [announce, setAnnounce] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const totalPence = useMemo(
    () => (runwayInput?.incomes ?? []).reduce((s, i) => s + i.amountPence, 0),
    [runwayInput],
  );

  if (today === null || settings === null) return null;
  const items = settings.incomeItems;
  const loanDate = settings.loanDate;

  const openForm = (frequency: Frequency) =>
    setForm((f) => ({ key: (f?.key ?? 0) + 1, frequency }));

  const addShift = () => {
    const firstDate = nextSaturday(today);
    addIncome({ label: "Saturday shift", amountPence: 6000, firstDate, frequency: "weekly" });
    setAnnounce(`Added Saturday shift, £60.00 every week from ${formatDay(firstDate)}.`);
  };

  return (
    <MoneyCard
      headingId="money-in-heading"
      headingRef={headingRef}
      title="💼 Money coming in"
      hint="Part-time shifts, paydays, birthday money: add it and your runway updates."
    >
      <div
        className="mt-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Quick add money coming in"
      >
        <button type="button" onClick={addShift} className={CHIP_CLASS}>
          <span aria-hidden="true">💼</span> Saturday shift · £60 weekly
        </button>
        <button type="button" onClick={() => openForm("once")} className={CHIP_CLASS}>
          <span aria-hidden="true">🎁</span> One-off money
        </button>
        <button type="button" onClick={() => openForm("weekly")} className={CHIP_CLASS}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Other money in
        </button>
      </div>

      {form ? (
        <RecurringForm
          key={form.key}
          today={today}
          ariaLabel="Add money coming in"
          title="Add money coming in"
          submitText="Add money in"
          amountLabel="How much (£)"
          dateLabel="First date"
          amountPlaceholder="60.00"
          labelPlaceholder={form.frequency === "once" ? "Birthday money" : "Café shift"}
          initialLabel=""
          initialDate={form.frequency === "once" ? today : nextSaturday(today)}
          initialFrequency={form.frequency}
          chooseFrequency
          focus="label"
          onCancel={() => {
            setForm(null);
            headingRef.current?.focus();
          }}
          onSubmit={(item) => {
            addIncome(item);
            setAnnounce(`Added ${item.label}, ${incomeLine(item)}.`);
            setForm(null);
            headingRef.current?.focus();
          }}
        />
      ) : null}

      {items.length > 0 ? (
        <>
          <h3 className="mt-4 text-sm font-semibold focus:outline-none">
            Expected before loan day
          </h3>
          <ul className="mt-1 divide-y divide-border">
            {items.map((item) => {
              const counted = expandRecurring(item, today, loanDate).length > 0;
              return (
                <li key={item.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {incomeLine(item)}
                      {counted ? null : (
                        <span className="font-medium"> · after loan day, not counted</span>
                      )}
                    </p>
                  </div>
                  <RemoveButton
                    label={item.label}
                    onClick={() => {
                      removeIncome(item.id);
                      setAnnounce(`Removed ${item.label}.`);
                      headingRef.current?.focus();
                    }}
                  />
                </li>
              );
            })}
          </ul>
          <p className="mt-2 rounded-xl bg-success-soft px-3 py-2 font-semibold tabular-nums text-success-strong">
            {`+${pounds(totalPence)} before loan day`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Expected money, your own estimate. Only add what you're fairly sure will come in.
          </p>
        </>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </MoneyCard>
  );
}
