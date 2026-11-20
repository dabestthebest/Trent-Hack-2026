// Header XP pill: "Lv 2 · 140 XP" with a tiny bar to the next level. On phones it shrinks to a 36px
// level ring so it fits beside the nav at 360px; the full details stay in its accessible label.
// Tapping opens today's quests (or calls onClick when given).

import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { progressLine, questProgress } from "@/lib/fun/quests";
import { useFun, type FunStore } from "@/lib/fun/store";
import { cn } from "@/lib/utils";

import { CoinMascot } from "./CoinMascot";
import { LevelBar, QuestList } from "./DailyQuests";

export interface XpBadgeProps {
  /** Replace the quests popover with your own action. */
  onClick?: (() => void) | undefined;
  className?: string | undefined;
}

function badgeLabel(fun: FunStore): string {
  const { level, title, intoLevel, perLevel } = fun.level;
  const { done, total } = questProgress(fun);
  return `Level ${level}, ${title}, ${fun.xp} XP. ${perLevel - intoLevel} XP to level ${level + 1}. Today's quests: ${done} of ${total} done.`;
}

const BadgeButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { fun: FunStore }
>(function BadgeButton({ fun, className, ...props }, ref) {
  const { level, intoLevel, perLevel } = fun.level;
  const pct = Math.round((intoLevel / perLevel) * 100);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={badgeLabel(fun)}
      className={cn(
        "group inline-flex shrink-0 items-center justify-center rounded-full transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    >
      {/* Phones: a level ring. The ring fill is progress to the next level. */}
      <span
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-full sm:hidden"
        style={{
          background: `conic-gradient(var(--primary) ${pct}%, var(--muted) 0)`,
        }}
      >
        <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-card leading-none">
          <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">
            Lv
          </span>
          <span className="-mt-0.5 font-display text-[13px] font-extrabold text-primary">
            {level}
          </span>
        </span>
      </span>

      {/* Wider screens: the full pill. */}
      <span
        aria-hidden="true"
        className="hidden items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-1 pr-3 shadow-sm sm:inline-flex"
      >
        <CoinMascot mood="happy" size={24} animate={false} />
        <span className="flex flex-col items-start leading-none">
          <span className="whitespace-nowrap text-xs font-bold tabular-nums">
            Lv {level} · {fun.xp} XP
          </span>
          <span className="mt-1 block h-1 w-full min-w-14 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </span>
        </span>
      </span>
    </button>
  );
});

export function XpBadge({ onClick, className }: XpBadgeProps) {
  const fun = useFun();

  if (onClick) return <BadgeButton fun={fun} onClick={onClick} className={className} />;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <BadgeButton fun={fun} className={className} />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label="Today's quests"
        className="w-[min(21rem,calc(100vw-2rem))] rounded-2xl p-3.5"
      >
        <div className="flex items-center gap-2.5">
          <CoinMascot mood="happy" size={40} className="shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight">Daily quests</p>
            <p className="text-xs font-semibold tabular-nums text-muted-foreground">
              {progressLine(fun)}
            </p>
          </div>
        </div>
        <LevelBar fun={fun} className="mt-3" />
        <div className="mt-3 max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain">
          <QuestList compact />
        </div>
        <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
          Quests reset at midnight. XP stays on this device only.
        </p>
      </PopoverContent>
    </Popover>
  );
}
