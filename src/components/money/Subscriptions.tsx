// "Subscriptions": monthly things that leave the account. The store turns each payment before loan day
// into a bill, so they show on the calendar and lower the safe daily amount.

import { useMemo, useRef, useState } from "react";

import { pounds } from "@/lib/dibs/format";
import { addDays, formatDay } from "@/lib/money/dates";
import { expandRecurring, type RecurringItem } from "@/lib/money/recurring";
import { useMoney } from "@/lib/money/store";
import type { ISODate } from "@/lib/money/types";

import { CHIP_CLASS, MoneyCard, RecurringForm, RemoveButton } from "./MoneyIn";

/** Label-only quick picks. No prices: the student types what they actually pay. */
const QUICK_SUBS = [
  { emoji: "🎵", label: "Music streaming" },
  { emoji: "📺", label: "Video streaming" },
  { emoji: "🏋️", label: "Gym" },
  { emoji: "☁️", label: "Cloud storage" },
] as const;

/** The next payment on or after today (the first date itself if that's still to come). */
function nextPayment(item: RecurringItem, today: ISODate): ISODate {
  return expandRecurring(item, today, addDays(today, 63))[0]?.date ?? item.firstDate;
}

interface FormState {
  key: number;
  label: string;
}

export function Subscriptions() {
  const { today, settings, addSubscription, removeSubscription } = useMoney();
  const [form, setForm] = useState<FormState | null>(null);
  const [announce, setAnnounce] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const totals = useMemo(() => {
    if (today === null || settings === null) return { monthly: 0, beforeLoan: 0 };
    let monthly = 0;
    let beforeLoan = 0;
    for (const s of settings.subscriptions) {
      monthly += s.amountPence;
      for (const o of expandRecurring(s, today, settings.loanDate)) beforeLoan += o.amountPence;
    }
    return { monthly, beforeLoan };
  }, [today, settings]);

  if (today === null || settings === null) return null;
  const items = settings.subscriptions;

  const openForm = (label: string) => setForm((f) => ({ key: (f?.key ?? 0) + 1, label }));

  return (
    <MoneyCard
      headingId="subscriptions-heading"
      headingRef={headingRef}
      title="🔁 Subscriptions"
      hint="Monthly stuff that leaves your account. Each one counts as a bill before loan day."
    >
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick add a subscription">
        {QUICK_SUBS.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => openForm(q.label)}
            className={CHIP_CLASS}
          >
            <span aria-hidden="true">{q.emoji}</span> {q.label}
          </button>
        ))}
        <button type="button" onClick={() => openForm("")} className={CHIP_CLASS}>
          + Another subscription
        </button>
      </div>

      {form ? (
        <RecurringForm
          key={form.key}
          today={today}
          ariaLabel="Add a subscription"
          title="Add a subscription"
          submitText="Add subscription"
          amountLabel="£ per month"
          dateLabel="Next payment date"
          amountPlaceholder="0.00"
          labelPlaceholder="Music streaming"
          initialLabel={form.label}
          initialDate={addDays(today, 7)}
          initialFrequency="monthly"
          chooseFrequency={false}
          focus={form.label === "" ? "label" : "amount"}
          onCancel={() => {
            setForm(null);
            headingRef.current?.focus();
          }}
          onSubmit={(item) => {
            addSubscription(item);
            setAnnounce(
              `Added ${item.label}, ${pounds(item.amountPence)} a month from ${formatDay(item.firstDate)}.`,
            );
            setForm(null);
            headingRef.current?.focus();
          }}
        />
      ) : null}

      {items.length > 0 ? (
        <>
          <h3 className="mt-4 text-sm font-semibold focus:outline-none">Your subscriptions</h3>
          <ul className="mt-1 divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.label}</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {`${pounds(item.amountPence)} a month, next ${formatDay(nextPayment(item, today))}`}
                  </p>
                </div>
                <RemoveButton
                  label={item.label}
                  onClick={() => {
                    removeSubscription(item.id);
                    setAnnounce(`Removed ${item.label}.`);
                    headingRef.current?.focus();
                  }}
                />
              </li>
            ))}
          </ul>
          <p className="mt-2 rounded-xl bg-secondary/60 px-3 py-2 font-semibold tabular-nums">
            {`${pounds(totals.monthly)} a month · ${pounds(totals.beforeLoan)} before loan day`}
          </p>
        </>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </MoneyCard>
  );
}
