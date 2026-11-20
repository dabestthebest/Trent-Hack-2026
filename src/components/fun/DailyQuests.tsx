// "Daily quests": today's six habits, what each is worth and which are done. Done is shown with a
// tick AND the word "Done", never colour alone. QuestList is shared with the XP badge's popover.

import { Check, Circle } from "lucide-react";

import { useFun, type FunStore } from "@/lib/fun/store";
import type { Mood } from "@/lib/fun/tips";
import { MADE_IT_HINT, QUEST_HINTS, progressLine, questProgress } from "@/lib/fun/quests";
import { cn } from "@/lib/utils";

import { CoinMascot } from "./CoinMascot";

function Row({
  emoji,
  title,
  xp,
  done,
  hint,
  compact,
}: {
  emoji: string;
  title: string;
  xp: number;
  done: boolean;
  hint: string | null;
  compact: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
        done ? "border-transparent bg-success-soft" : "border-border bg-background/60",
      )}
    >
      <span aria-hidden="true" className={cn("shrink-0", compact ? "text-lg" : "text-xl")}>
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block font-semibold leading-snug",
            compact ? "text-sm" : "text-[15px]",
            done ? "text-success-strong" : "text-foreground",
          )}
        >
          {title}
        </span>
        {hint !== null && !done ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
            done ? "bg-card/70 text-success-strong" : "bg-primary/10 text-primary",
          )}
        >
          +{xp} XP
        </span>
        {done ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-success-strong">
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            Done
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Circle className="h-3 w-3" aria-hidden="true" />
            To do
          </span>
        )}
      </span>
    </li>
  );
}

/** Today's quests, then bonus achievements. */
export function QuestList({
  compact = false,
  showHints = !compact,
}: {
  compact?: boolean | undefined;
  showHints?: boolean | undefined;
}) {
  const fun = useFun();
  return (
    <div className="space-y-3">
      <ul className={compact ? "space-y-1.5" : "space-y-2"} aria-label="Today's quests">
        {fun.questsToday.map(({ quest, done }) => (
          <Row
            key={quest.id}
            emoji={quest.emoji}
            title={quest.title}
            xp={quest.xp}
            done={done}
            hint={showHints ? QUEST_HINTS[quest.id] : null}
            compact={compact}
          />
        ))}
      </ul>
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Bonus
        </p>
        <ul className={compact ? "space-y-1.5" : "space-y-2"} aria-label="Bonus achievements">
          {fun.achievementsToday.map(({ achievement, done }) => (
            <Row
              key={achievement.id}
              emoji={achievement.emoji}
              title={achievement.title}
              xp={achievement.xp}
              done={done}
              hint={showHints ? MADE_IT_HINT : null}
              compact={compact}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A thin bar showing progress through the current level, with the numbers in text. */
export function LevelBar({ fun, className }: { fun: FunStore; className?: string | undefined }) {
  const { level, title, intoLevel, perLevel, rank } = fun.level;
  const pct = Math.round((intoLevel / perLevel) * 100);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-display font-bold">
          Lv {level} · {title} · {rank.emoji} {rank.name} rank
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {intoLevel}/{perLevel} XP to Lv {level + 1}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Level ${level} progress`}
        aria-valuemin={0}
        aria-valuemax={perLevel}
        aria-valuenow={intoLevel}
        aria-valuetext={`${intoLevel} of ${perLevel} XP to level ${level + 1}`}
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function moodFor(done: number, total: number): Mood {
  if (done >= total) return "party";
  if (done > 0) return "happy";
  return "chill";
}

function cheer(done: number, total: number): string {
  if (done >= total) return "All six done. Certified money main character 💅";
  if (done === 0) return "Fresh quests every midnight. Stack that XP 📈";
  if (done >= total - 2) return "So close. Finish the set?";
  return "Nice start. Keep the streak going 🔥";
}

export function DailyQuests({ className }: { className?: string | undefined }) {
  const fun = useFun();
  const { done, total } = questProgress(fun);

  return (
    <section
      aria-labelledby="daily-quests-heading"
      className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5", className)}
    >
      <div className="flex items-center gap-3">
        <CoinMascot mood={moodFor(done, total)} size={56} className="shrink-0" />
        <div className="min-w-0">
          <h2 id="daily-quests-heading" className="font-display text-xl font-bold leading-tight">
            Daily quests
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{cheer(done, total)}</p>
        </div>
      </div>

      <LevelBar fun={fun} className="mt-4" />

      <p className="mt-3 text-sm font-semibold tabular-nums" data-testid="quest-progress">
        {progressLine(fun)}
      </p>

      <div className="mt-2">
        <QuestList />
      </div>
    </section>
  );
}
