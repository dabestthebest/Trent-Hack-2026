import { ChevronDown, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import { pounds } from "@/lib/dibs/format";
import { addDays, diffDays, formatDay, formatDayLong } from "@/lib/money/dates";
import { MAX_RUNWAY_DAYS } from "@/lib/money/runway";
import { useMoney, type MoneySettings } from "@/lib/money/store";
import type { ISODate } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import { dayCount, poundsShort, removeBillLabel } from "./copy";
import { scrollIntoViewGently } from "./dom";
import { Field } from "./fields";
import { LABEL_MAX, parseDate, parseLabel, parsePounds, penceToInput } from "./parse";
import { FOCUS_RING } from "./styles";

interface YourNumbersProps {
  today: ISODate;
  settings: MoneySettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bumped by the page to open the editor on the loan day field. */
  focusLoanDateSignal: number;
  /** Puts the demo numbers back (the page also clears its own preview state). */
  onReset: () => void;
}

export function YourNumbers({
  today,
  settings,
  open,
  onOpenChange,
  focusLoanDateSignal,
  onReset,
}: YourNumbersProps) {
  const panelId = useId();
  const [formKey, setFormKey] = useState(0);
  const [announce, setAnnounce] = useState("");
  const billCount = settings.bills.length;

  return (
    <section
      aria-labelledby="numbers-heading"
      className="scroll-mt-20 rounded-2xl border border-border bg-card shadow-sm"
    >
      <h2 id="numbers-heading" className="font-display text-xl font-semibold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onOpenChange(!open)}
          className={cn(
            "flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left",
            FOCUS_RING,
          )}
        >
          Your numbers
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </h2>
      {!open ? (
        <p className="-mt-1 px-4 pb-4 text-sm text-muted-foreground">
          {pounds(settings.balancePence)} now · {poundsShort(settings.overdraftPence)} overdraft ·{" "}
          {pounds(settings.dailySpendPence)} a day · {billCount}{" "}
          {billCount === 1 ? "bill" : "bills"}
        </p>
      ) : null}

      <div id={panelId} hidden={!open}>
        {open ? (
          <NumbersForm
            key={formKey}
            today={today}
            settings={settings}
            focusLoanDateSignal={focusLoanDateSignal}
            onAnnounce={setAnnounce}
            onReset={() => {
              onReset();
              setFormKey((k) => k + 1);
              setAnnounce("Demo numbers are back.");
            }}
          />
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}

type MoneyField = "balancePence" | "overdraftPence" | "dailySpendPence";

const EMPTY_MESSAGE: Record<MoneyField, string> = {
  balancePence: "Enter your balance. Use 0 if it's empty.",
  overdraftPence: "Enter your arranged overdraft. Use 0 if you don't have one.",
  dailySpendPence: "Enter what you usually spend a day.",
};

interface NumbersFormProps {
  today: ISODate;
  settings: MoneySettings;
  focusLoanDateSignal: number;
  onAnnounce: (text: string) => void;
  onReset: () => void;
}

function NumbersForm({
  today,
  settings,
  focusLoanDateSignal,
  onAnnounce,
  onReset,
}: NumbersFormProps) {
  const { updateSettings } = useMoney();
  const loanRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Record<MoneyField, string>>(() => ({
    balancePence: penceToInput(settings.balancePence),
    overdraftPence: penceToInput(settings.overdraftPence),
    dailySpendPence: penceToInput(settings.dailySpendPence),
  }));
  const [errors, setErrors] = useState<Record<MoneyField, string | null>>({
    balancePence: null,
    overdraftPence: null,
    dailySpendPence: null,
  });
  const [loanDraft, setLoanDraft] = useState(settings.loanDate);
  const [loanError, setLoanError] = useState<string | null>(null);

  const minLoan = addDays(today, 1);
  const maxLoan = addDays(today, MAX_RUNWAY_DAYS);

  useEffect(() => {
    if (focusLoanDateSignal === 0) return;
    const el = loanRef.current;
    if (el === null) return;
    el.focus({ preventScroll: true });
    scrollIntoViewGently(el, "center");
  }, [focusLoanDateSignal]);

  const setMoney = (field: MoneyField, raw: string) => {
    setDrafts((d) => ({ ...d, [field]: raw }));
    const parsed = parsePounds(raw, { allowZero: true, emptyMessage: EMPTY_MESSAGE[field] });
    if (parsed.ok) {
      setErrors((e) => ({ ...e, [field]: null }));
      const patch: Partial<Omit<MoneySettings, "bills">> = {};
      patch[field] = parsed.value;
      updateSettings(patch);
    } else {
      let error = parsed.error;
      if (field === "balancePence" && error === "Enter £0 or more.") {
        error =
          "Enter £0 or more. Already overdrawn? Enter 0 and take what you've used off your overdraft.";
      }
      setErrors((e) => ({ ...e, [field]: error }));
    }
  };

  // Tidy "6.5" into "6.50" once they leave a valid field.
  const tidy = (field: MoneyField) => {
    const parsed = parsePounds(drafts[field], { allowZero: true });
    if (parsed.ok) setDrafts((d) => ({ ...d, [field]: penceToInput(parsed.value) }));
  };

  const stepSpend = (deltaPence: number) => {
    const parsed = parsePounds(drafts.dailySpendPence, { allowZero: true });
    const current = parsed.ok ? parsed.value : settings.dailySpendPence;
    const next = Math.max(0, current + deltaPence);
    setMoney("dailySpendPence", penceToInput(next));
  };

  const setLoan = (raw: string) => {
    setLoanDraft(raw);
    const parsed = parseDate(raw);
    if (!parsed.ok) {
      setLoanError(parsed.error);
      return;
    }
    // Commit even when it's not after today: the page then explains what to fix.
    updateSettings({ loanDate: parsed.value });
    if (parsed.value <= today) setLoanError("Loan day needs to be after today.");
    else if (parsed.value > maxLoan) {
      setLoanError(`Loan day needs to be within ${MAX_RUNWAY_DAYS} days of today.`);
    } else setLoanError(null);
  };

  const loanHint =
    loanError === null && settings.loanDate > today
      ? `${formatDayLong(settings.loanDate)} · ${dayCount(diffDays(settings.loanDate, today))} away`
      : "Your next Student Finance payment date.";

  return (
    <div className="space-y-6 border-t border-border px-4 pb-4 pt-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Balance now"
          prefix="£"
          inputMode="decimal"
          autoComplete="off"
          value={drafts.balancePence}
          error={errors.balancePence}
          hint="What your banking app says today."
          onChange={(e) => setMoney("balancePence", e.target.value)}
          onBlur={() => tidy("balancePence")}
        />
        <Field
          label="Arranged overdraft"
          prefix="£"
          inputMode="decimal"
          autoComplete="off"
          value={drafts.overdraftPence}
          error={errors.overdraftPence}
          hint="Your agreed limit. 0 if you don't have one."
          onChange={(e) => setMoney("overdraftPence", e.target.value)}
          onBlur={() => tidy("overdraftPence")}
        />
        <Field
          label="Usual spend per day"
          prefix="£"
          inputMode="decimal"
          autoComplete="off"
          value={drafts.dailySpendPence}
          error={errors.dailySpendPence}
          hint="Food, travel, coffee. Not the bills below."
          onChange={(e) => setMoney("dailySpendPence", e.target.value)}
          onBlur={() => tidy("dailySpendPence")}
          after={
            <div className="flex shrink-0 gap-1">
              <StepButton label="Spend 50p less a day" onClick={() => stepSpend(-50)}>
                <Minus className="h-4 w-4" aria-hidden="true" />
              </StepButton>
              <StepButton label="Spend 50p more a day" onClick={() => stepSpend(50)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </StepButton>
            </div>
          }
        />
        <Field
          label="Loan day"
          type="date"
          inputRef={loanRef}
          value={loanDraft}
          min={minLoan}
          max={maxLoan}
          error={loanError}
          hint={loanHint}
          onChange={(e) => setLoan(e.target.value)}
        />
      </div>

      <BillsEditor today={today} settings={settings} onAnnounce={onAnnounce} />

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={onReset}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-secondary/60",
            FOCUS_RING,
          )}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset demo
        </button>
        <p className="text-xs text-muted-foreground">Puts back the demo numbers and bills.</p>
      </div>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-12 w-11 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary/60",
        FOCUS_RING,
      )}
    >
      {children}
    </button>
  );
}

interface BillErrors {
  label: string | null;
  amount: string | null;
  date: string | null;
}

function BillsEditor({
  today,
  settings,
  onAnnounce,
}: {
  today: ISODate;
  settings: MoneySettings;
  onAnnounce: (text: string) => void;
}) {
  const { addBill, removeBill } = useMoney();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => addDays(today, 7));
  const [errors, setErrors] = useState<BillErrors>({ label: null, amount: null, date: null });

  const bills = useMemo(
    () =>
      [...settings.bills].sort((a, b) =>
        a.date === b.date ? a.label.localeCompare(b.label) : a.date < b.date ? -1 : 1,
      ),
    [settings.bills],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const pl = parseLabel(label);
    const pa = parsePounds(amount, { allowZero: false, emptyMessage: "Enter how much it is." });
    const pd = parseDate(date, {
      min: today,
      minMessage: "Pick today or later. Past bills are already paid.",
    });
    setErrors({
      label: pl.ok ? null : pl.error,
      amount: pa.ok ? null : pa.error,
      date: pd.ok ? null : pd.error,
    });
    if (!pl.ok || !pa.ok || !pd.ok) {
      const firstBad = !pl.ok ? labelRef : !pa.ok ? amountRef : dateRef;
      firstBad.current?.focus();
      return;
    }
    addBill({ label: pl.value, amountPence: pa.value, date: pd.value });
    onAnnounce(`Added ${pl.value}, ${pounds(pa.value)} on ${formatDay(pd.value)}.`);
    setLabel("");
    setAmount("");
    labelRef.current?.focus();
  };

  return (
    <div>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-lg font-semibold focus:outline-none"
      >
        Bills before loan day
      </h3>
      <p className="text-sm text-muted-foreground">
        One-off costs with a date: phone, rent top-up, train home.
      </p>

      {bills.length === 0 ? (
        <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">No bills yet. Add one below.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {bills.map((b) => {
            // Only meaningful while there is a runway (loan day after today).
            const outside =
              settings.loanDate > today && (b.date < today || b.date >= settings.loanDate);
            return (
              <li key={b.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.label}</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {pounds(b.amountPence)} · {formatDay(b.date)}
                    {outside ? (
                      <span className="font-medium">
                        {b.date < today
                          ? " · before today, not counted"
                          : " · after loan day, not counted"}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={removeBillLabel(b.label, b.date)}
                  onClick={() => {
                    removeBill(b.id);
                    onAnnounce(`Removed ${b.label}.`);
                    headingRef.current?.focus();
                  }}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-warning-soft hover:text-destructive",
                    FOCUS_RING,
                  )}
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={submit}
        noValidate
        aria-label="Add a bill"
        className="mt-3 space-y-3 rounded-2xl border border-dashed border-border bg-background/60 p-3"
      >
        <p className="text-sm font-semibold">Add a bill</p>
        <Field
          label="What"
          inputRef={labelRef}
          value={label}
          maxLength={LABEL_MAX + 10}
          autoComplete="off"
          placeholder="Phone bill"
          error={errors.label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <Field
            label="How much"
            prefix="£"
            inputRef={amountRef}
            inputMode="decimal"
            autoComplete="off"
            placeholder="15.00"
            value={amount}
            error={errors.amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Field
            label="Date"
            type="date"
            inputRef={dateRef}
            min={today}
            value={date}
            error={errors.date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 font-semibold text-secondary-foreground hover:brightness-95",
            FOCUS_RING,
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add bill
        </button>
      </form>
    </div>
  );
}
