// Two-option segmented control for /dibs: the fair rooms and rent tool, or shared house bills.
// Both panels stay mounted (the hidden one is `hidden`), so switching tabs never loses what you typed.

import { useId, useRef, type KeyboardEvent } from "react";

import { DibsApp } from "@/components/dibs/DibsApp";
import { FOCUS_RING } from "@/components/money/styles";
import { cn } from "@/lib/utils";

import type { DibsTab } from "./houseData";
import { SharedBills } from "./SharedBills";

const TABS: readonly { id: DibsTab; emoji: string; label: string }[] = [
  { id: "rooms", emoji: "🏠", label: "Rooms & rent" },
  { id: "bills", emoji: "🧾", label: "Shared bills" },
];

export function DibsTabs({ tab, onSelect }: { tab: DibsTab; onSelect: (tab: DibsTab) => void }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    const target = TABS[next];
    if (target === undefined) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onSelect(target.id);
  };

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Dibs tools"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-secondary/60 p-1"
      >
        {TABS.map((t, i) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-center text-sm leading-tight transition sm:text-base",
                selected
                  ? "bg-card font-bold text-foreground shadow-sm ring-1 ring-border"
                  : "font-medium text-muted-foreground hover:bg-card/60 hover:text-foreground",
                FOCUS_RING,
              )}
            >
              <span aria-hidden="true">{t.emoji}</span> {t.label}
            </button>
          );
        })}
      </div>
      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={t.id !== tab}
        >
          {t.id === "rooms" ? <DibsApp /> : <SharedBills />}
        </div>
      ))}
    </div>
  );
}
