// Shared bills for the house: log who paid for what, see who owes who, and settle up in a few
// transfers. State lives here (nothing is stored); "You" can push what they owe into the runway.

import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";

import { Field, INPUT_CLASS } from "@/components/money/fields";
import { parseDate, parseLabel, parsePounds } from "@/components/money/parse";
import { FOCUS_RING } from "@/components/money/styles";
import { pounds } from "@/lib/dibs/format";
import { balances, settleTransfers, totalPence, type Expense } from "@/lib/house/ledger";
import { addDays, formatDay } from "@/lib/money/dates";
import { useMoney } from "@/lib/money/store";
import type { ISODate } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import {
  balanceSentence,
  demoExpenses,
  displayNames,
  HOUSEMATE_NAME_MAX,
  HOUSEMATES_DEFAULT,
  MAX_EXPENSE_PENCE,
  PAY_BACK_DAYS_AHEAD,
  settleMessage,
  settleUpHref,
  splitLine,
} from "./houseData";

const PRIMARY_BUTTON = cn(
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-center font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 sm:inline-flex sm:w-auto",
  FOCUS_RING,
);
const SECONDARY_BUTTON = cn(
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-card px-5 py-2 text-center font-semibold text-foreground transition hover:bg-secondary sm:inline-flex sm:w-auto",
  FOCUS_RING,
);
const CARD = "rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5";

export function SharedBills() {
  const { today, addBill } = useMoney();
  const [rawNames, setRawNames] = useState<string[]>([...HOUSEMATES_DEFAULT]);
  // null = still the demo list (it needs today's date, which only exists on the client).
  const [edited, setEdited] = useState<Expense[] | null>(null);
  const [addedPence, setAddedPence] = useState<number | null>(null);

  const expenses = useMemo(() => edited ?? (today ? demoExpenses(today) : []), [edited, today]);
  const names = displayNames(rawNames);
  const net = useMemo(() => balances(names.length, expenses), [names.length, expenses]);
  const transfers = useMemo(() => settleTransfers(net), [net]);
  const total = totalPence(expenses);
  const youOwe = Math.max(0, -(net[0] ?? 0));

  if (today === null) return <SharedBillsSkeleton />;

  const updateExpenses = (fn: (list: Expense[]) => Expense[]) =>
    setEdited((prev) => fn(prev ?? demoExpenses(today)));

  const sorted = [...expenses].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const message = settleMessage(names, transfers, expenses.length, total);

  return (
    <div className="space-y-5">
      <header className="space-y-2 pt-1">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Who owes who?
        </h1>
        <p className="text-muted-foreground">
          Log what each of you paid for the house. It splits each bill equally between the people
          you tick and works out who pays who to settle up.
        </p>
      </header>

      <section aria-labelledby="housemates-heading" className={CARD}>
        <h2 id="housemates-heading" className="font-display text-xl font-semibold">
          Housemates
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {rawNames.map((raw, i) => (
            <Field
              key={i}
              label={`Person ${i + 1}`}
              value={raw}
              maxLength={HOUSEMATE_NAME_MAX}
              autoComplete="off"
              error={raw.trim() === "" ? "Add a name." : null}
              onChange={(e) => {
                const value = e.target.value.slice(0, HOUSEMATE_NAME_MAX);
                setRawNames((ns) => ns.map((n, k) => (k === i ? value : n)));
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Person 1 is you. Names up to {HOUSEMATE_NAME_MAX} characters.
        </p>
      </section>

      <section aria-labelledby="bills-heading" className={CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="bills-heading" className="font-display text-xl font-semibold">
            Shared bills
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{pounds(total)}</span>{" "}
            shared so far
          </p>
        </div>
        {sorted.length === 0 ? (
          <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">
            No shared bills yet. Add the first one below.
          </p>
        ) : (
          <ul aria-label="Shared bills" className="mt-3 divide-y divide-border">
            {sorted.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="min-w-0 break-words font-semibold">{e.label}</span>
                    <span className="font-semibold tabular-nums">{pounds(e.amountPence)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {splitLine(names, e)} · {formatDay(e.date)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${e.label}`}
                  onClick={() => updateExpenses((list) => list.filter((x) => x.id !== e.id))}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                    FOCUS_RING,
                  )}
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <AddExpenseForm
          names={names}
          today={today}
          onAdd={(e) => updateExpenses((list) => [...list, e])}
        />
      </section>

      <section aria-labelledby="balances-heading" className={CARD}>
        <h2 id="balances-heading" className="font-display text-xl font-semibold">
          Where everyone stands
        </h2>
        <ul aria-label="Balances" className="mt-3 space-y-2">
          {net.map((v, i) => (
            <li
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-xl p-3",
                v > 0 ? "bg-success-soft" : v < 0 ? "bg-warning-soft" : "bg-secondary/60",
              )}
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card font-bold tabular-nums"
              >
                {v > 0 ? "+" : v < 0 ? "−" : "="}
              </span>
              <span className="font-medium">{balanceSentence(names, i, v)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="settle-bills-heading" className={CARD}>
        <h2 id="settle-bills-heading" className="font-display text-xl font-semibold">
          Settle up
        </h2>
        {transfers.length === 0 ? (
          <p className="mt-2 font-medium">Everyone is square. Nothing to settle.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {transfers.length === 1 ? "One payment" : `${transfers.length} payments`} and everyone
              is square:
            </p>
            <ul aria-label="Settle-up payments" className="mt-2 space-y-2">
              {transfers.map((t, k) => (
                <li
                  key={k}
                  className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 p-3 font-semibold"
                >
                  <span className="min-w-0">
                    {names[t.from]} <span aria-hidden="true">→</span>
                    <span className="sr-only">pays</span> {names[t.to]}
                  </span>
                  <span className="tabular-nums">{pounds(t.amountPence)}</span>
                </li>
              ))}
            </ul>
            <a
              href={settleUpHref(message)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(SECONDARY_BUTTON, "mt-4")}
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Send settle-up to the house chat
            </a>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Opens WhatsApp with the message ready. Nothing is sent until you press send.
            </p>
          </>
        )}

        <RunwayLink
          youOwe={youOwe}
          addedPence={addedPence}
          onAdd={() => {
            addBill({
              label: "Pay back housemates",
              amountPence: youOwe,
              date: addDays(today, PAY_BACK_DAYS_AHEAD),
            });
            setAddedPence(youOwe);
          }}
        />
      </section>
    </div>
  );
}

function RunwayLink({
  youOwe,
  addedPence,
  onAdd,
}: {
  youOwe: number;
  addedPence: number | null;
  onAdd: () => void;
}) {
  const justAdded = addedPence !== null && addedPence === youOwe;
  return (
    <div className="mt-4">
      <p role="status" aria-live="polite" className="sr-only">
        {justAdded ? `Added ${pounds(addedPence)} to your runway.` : ""}
      </p>
      {justAdded ? (
        <div className="rounded-xl border-2 border-success/30 bg-success-soft p-3">
          <p className="flex items-center gap-2 font-semibold text-success-strong">
            <Check className="h-5 w-5" aria-hidden="true" /> Added to your runway ✓
          </p>
          <Link
            to="/"
            className={cn(
              "mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg font-semibold text-foreground underline underline-offset-4",
              FOCUS_RING,
            )}
          >
            See your safe daily spend <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : youOwe > 0 ? (
        <div className="rounded-xl border-2 border-primary/25 bg-primary/5 p-3">
          <p className="text-sm text-muted-foreground">
            Paying it back comes out of your money before loan day. Add it as a bill in{" "}
            {PAY_BACK_DAYS_AHEAD} days and your safe daily spend updates.
          </p>
          <button type="button" onClick={onAdd} className={cn(PRIMARY_BUTTON, "mt-3")}>
            Add what you owe ({pounds(youOwe)}) to Til Loan Day
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface AddExpenseFormProps {
  names: readonly string[];
  today: ISODate;
  onAdd: (e: Expense) => void;
}

let expenseCounter = 0;

function AddExpenseForm({ names, today, onAdd }: AddExpenseFormProps) {
  const ids = useId();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(0);
  const [split, setSplit] = useState<boolean[]>(() => names.map(() => true));
  const [date, setDate] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    label?: string;
    amount?: string;
    split?: string;
    date?: string;
  }>({});
  const [announce, setAnnounce] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);

  const dateValue = date ?? today;

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const l = parseLabel(label);
    const a = parsePounds(amount, { allowZero: false, maxPence: MAX_EXPENSE_PENCE });
    const d = parseDate(dateValue);
    const splitAmong = split.flatMap((on, i) => (on && i < names.length ? [i] : []));
    const next: typeof errors = {};
    if (!l.ok) next.label = l.error;
    if (!a.ok) next.amount = a.error;
    if (!d.ok) next.date = d.error;
    if (splitAmong.length === 0) next.split = "Tick at least one person.";
    setErrors(next);
    if (!l.ok || !a.ok || !d.ok || splitAmong.length === 0) {
      setAnnounce("");
      return;
    }
    expenseCounter += 1;
    onAdd({
      id: `expense-${expenseCounter}`,
      label: l.value,
      amountPence: a.value,
      paidBy,
      splitAmong,
      date: d.value,
    });
    setAnnounce(`Added ${l.value}, ${pounds(a.value)}.`);
    setLabel("");
    setAmount("");
    setPaidBy(0);
    setSplit(names.map(() => true));
    setDate(null);
    labelRef.current?.focus();
  };

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby={`${ids}-add`}
      className="mt-4 space-y-3 rounded-xl border border-dashed border-border p-3 sm:p-4"
    >
      <h3 id={`${ids}-add`} className="font-display text-lg font-semibold">
        Add a shared bill
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
        <Field
          label="What was it?"
          inputRef={labelRef}
          value={label}
          placeholder="e.g. Big shop"
          autoComplete="off"
          error={errors.label ?? null}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Field
          label="Amount"
          prefix="£"
          inputMode="decimal"
          value={amount}
          placeholder="0.00"
          autoComplete="off"
          error={errors.amount ?? null}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`${ids}-payer`} className="block text-sm font-semibold">
            Who paid?
          </label>
          <select
            id={`${ids}-payer`}
            value={paidBy}
            onChange={(e) => setPaidBy(Number(e.target.value))}
            className={cn(INPUT_CLASS, "mt-1.5")}
          >
            {names.map((n, i) => (
              <option key={i} value={i}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Date"
          type="date"
          value={dateValue}
          error={errors.date ?? null}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <fieldset aria-describedby={errors.split ? `${ids}-split-error` : undefined}>
        <legend className="text-sm font-semibold">Split between</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {names.map((n, i) => (
            <label
              key={i}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 font-medium has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="checkbox"
                checked={split[i] ?? false}
                onChange={(e) => {
                  const on = e.target.checked;
                  setSplit((s) => names.map((_, k) => (k === i ? on : (s[k] ?? false))));
                }}
                className="h-5 w-5 accent-primary focus-visible:outline-none"
              />
              {n}
            </label>
          ))}
        </div>
        {errors.split ? (
          <p id={`${ids}-split-error`} className="mt-1 text-sm font-medium text-destructive">
            {errors.split}
          </p>
        ) : null}
      </fieldset>
      <button type="submit" className={PRIMARY_BUTTON}>
        <Plus className="h-5 w-5" aria-hidden="true" /> Add bill
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </form>
  );
}

function SharedBillsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading shared bills">
      <div className="h-9 w-2/3 rounded-lg bg-muted" />
      <div className="h-28 rounded-2xl bg-muted/70" />
      <div className="h-64 rounded-2xl bg-muted/70" />
      <div className="h-40 rounded-2xl bg-muted/70" />
    </div>
  );
}
