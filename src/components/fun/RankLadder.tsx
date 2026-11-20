// The rank ladder: every rank, where you are, and how much XP the next ones take. Seeing the road
// ahead (and that daily quests get you there) is the nudge towards steady habits.

import { Check, Lock } from "lucide-react";

import { RANKS, XP_PER_LEVEL } from "@/lib/fun/xp";
import { cn } from "@/lib/utils";

/** XP needed to reach the first level of a rank. Level L starts at (L - 1) × 100 XP. */
export function xpForLevel(level: number): number {
  return Math.max(0, (level - 1) * XP_PER_LEVEL);
}

export function RankLadder({ xp, className }: { xp: number; className?: string | undefined }) {
  const current = [...RANKS].reverse().find((r) => xp >= xpForLevel(r.fromLevel)) ?? RANKS[0];
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-semibold">Rank ladder</h3>
      <ol className="space-y-1.5" aria-label="Rank ladder">
        {RANKS.map((r) => {
          const need = xpForLevel(r.fromLevel);
          const reached = xp >= need;
          const isCurrent = current?.name === r.name;
          const toGo = Math.max(0, need - xp);
          return (
            <li
              key={r.name}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm",
                isCurrent
                  ? "border-primary bg-primary/10 font-semibold"
                  : reached
                    ? "border-border bg-secondary/50"
                    : "border-dashed border-border bg-background/60 text-muted-foreground",
              )}
            >
              <span aria-hidden="true" className={cn("text-lg", !reached && "grayscale")}>
                {r.emoji}
              </span>
              <span className="min-w-0 flex-1">
                {r.name}
                <span className="font-normal text-muted-foreground"> · from Lv {r.fromLevel}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> You&apos;re here
                  </span>
                ) : reached ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Reached
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" /> {toGo} XP to go
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        Daily quests are worth up to 150 XP a day with the bonus, so a few days of good habits gets
        you up the ladder.
      </p>
    </div>
  );
}
