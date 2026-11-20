import { useMemo, useRef, type Ref } from "react";

import { addDays, dayOfMonth, diffDays, formatDay, monthShort, weekday } from "@/lib/money/dates";
import { countStatuses } from "@/lib/money/runway";
import type { DayCell, DayStatus, ISODate } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import { cellLabel, countsLine } from "./copy";
import { useFlashWhenVisible } from "./hooks";
import { STATUS_CLASS } from "./styles";

interface DayCalendarProps {
  today: ISODate;
  loanDate: ISODate;
  /** The timeline to draw: the with-plan one while a plan is previewed. */
  timeline: DayCell[];
  /** The timeline without the plan, while a plan is previewed (to spot changed days). */
  baseline: DayCell[] | null;
  /** Label of the plan being previewed, or null. */
  planLabel: string | null;
  /** Changes whenever a different plan is previewed; re-triggers the highlight. */
  highlightKey: string | null;
  sectionRef?: Ref<HTMLElement>;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type Slot =
  | { kind: "blank"; date: ISODate }
  | { kind: "day"; date: ISODate; cell: DayCell; changed: boolean }
  | { kind: "loan"; date: ISODate };

function buildSlots(
  today: ISODate,
  loanDate: ISODate,
  timeline: DayCell[],
  baseline: DayCell[] | null,
): Slot[] {
  // Monday of today's week through Sunday of loan day's week. weekday(): 0 = Sunday.
  const start = addDays(today, -((weekday(today) + 6) % 7));
  const end = addDays(loanDate, (7 - weekday(loanDate)) % 7);
  const total = diffDays(end, start) + 1;
  const slots: Slot[] = [];
  for (let i = 0; i < total; i++) {
    const date = addDays(start, i);
    if (date === loanDate) {
      slots.push({ kind: "loan", date });
      continue;
    }
    const idx = diffDays(date, today);
    const cell = idx >= 0 ? timeline[idx] : undefined;
    if (cell === undefined || cell.date !== date) {
      slots.push({ kind: "blank", date });
      continue;
    }
    const was = baseline?.[idx];
    slots.push({
      kind: "day",
      date,
      cell,
      changed: was !== undefined && was.status !== cell.status,
    });
  }
  return slots;
}

export function DayCalendar({
  today,
  loanDate,
  timeline,
  baseline,
  planLabel,
  highlightKey,
  sectionRef,
}: DayCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const slots = useMemo(
    () => buildSlots(today, loanDate, timeline, baseline),
    [today, loanDate, timeline, baseline],
  );
  const counts = useMemo(() => countStatuses(timeline), [timeline]);
  const baseCounts = useMemo(() => (baseline ? countStatuses(baseline) : null), [baseline]);
  const changedCount = slots.filter((s) => s.kind === "day" && s.changed).length;
  const flashing = useFlashWhenVisible(changedCount > 0 ? highlightKey : null, gridRef);
  const previewing = planLabel !== null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="calendar-heading"
      className="scroll-mt-20 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4"
    >
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 id="calendar-heading" className="font-display text-xl font-semibold">
            {previewing ? `With ${planLabel}` : "Day by day"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{countsLine(counts, baseCounts)}</p>
        </div>
        {previewing ? (
          <span className="mt-1 shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            Preview
          </span>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground"
      >
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div
        ref={gridRef}
        role="group"
        aria-label={`Each day from today to loan day${previewing ? `, with ${planLabel}` : ""}`}
        className="mt-1 grid grid-cols-7 gap-1"
      >
        {slots.map((slot) => {
          if (slot.kind === "blank") {
            return <div key={slot.date} aria-hidden="true" className="h-14" />;
          }
          if (slot.kind === "loan") {
            return <LoanDayCell key={slot.date} date={slot.date} />;
          }
          return (
            <DayCellView
              key={slot.date}
              cell={slot.cell}
              isToday={slot.date === today}
              changed={previewing && slot.changed}
              flash={flashing && slot.changed}
            />
          );
        })}
      </div>

      <Legend />
    </section>
  );
}

function DayCellView({
  cell,
  isToday,
  changed,
  flash,
}: {
  cell: DayCell;
  isToday: boolean;
  changed: boolean;
  flash: boolean;
}) {
  const day = dayOfMonth(cell.date);
  const showMonth = day === 1 || isToday;
  const hatched = cell.status !== "own";
  return (
    <div
      role="img"
      aria-label={cellLabel(cell, { isToday, changed })}
      data-status={cell.status}
      className={`${cn(
        "relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-center transition-[outline-color,box-shadow] duration-300",
        isToday && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
        flash &&
          "z-10 outline outline-[3px] outline-offset-1 outline-primary motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-500",
      )} ${STATUS_CLASS[cell.status]}`}
    >
      {cell.billsPence > 0 ? (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-current ring-2 ring-card/80" />
      ) : null}
      {cell.status === "exhausted" ? (
        <span className="absolute left-0.5 top-0.5 rounded-sm bg-card/80 px-0.5 text-[10px] font-bold leading-none">
          ✕
        </span>
      ) : null}
      <span
        className={cn(
          "text-sm font-semibold leading-none tabular-nums",
          hatched && "rounded-sm bg-card/80 px-1 py-0.5",
        )}
      >
        {day}
      </span>
      {showMonth ? (
        <span className="text-[10px] font-semibold leading-none">{monthShort(cell.date)}</span>
      ) : null}
      {isToday ? <span className="text-[9px] font-bold leading-none">Today</span> : null}
    </div>
  );
}

function LoanDayCell({ date }: { date: ISODate }) {
  const day = dayOfMonth(date);
  return (
    <div
      role="img"
      aria-label={`${formatDay(date)}: Loan day, your next Student Finance payment`}
      className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-primary bg-primary/10 px-0.5 text-center text-primary"
    >
      <span className="text-[11px] font-semibold leading-none tabular-nums">
        {day}
        {day === 1 ? ` ${monthShort(date)}` : ""}
      </span>
      <span className="text-base leading-none" aria-hidden="true">
        💷
      </span>
      <span className="text-[9px] font-bold leading-none">Loan day</span>
    </div>
  );
}

function Swatch({ status }: { status: DayStatus }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${STATUS_CLASS[status]}`}
    >
      {status === "exhausted" ? <span className="rounded-sm bg-card/80 px-px">✕</span> : null}
    </span>
  );
}

function Legend() {
  return (
    <ul
      aria-label="Key"
      className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-1 pt-3 text-sm"
    >
      <li className="flex items-center gap-2">
        <Swatch status="own" /> Your money
      </li>
      <li className="flex items-center gap-2">
        <Swatch status="overdraft" /> Arranged overdraft
      </li>
      <li className="flex items-center gap-2">
        <Swatch status="exhausted" /> Overdraft used up
      </li>
      <li className="flex items-center gap-2 text-muted-foreground">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground" /> Bill due
      </li>
    </ul>
  );
}
