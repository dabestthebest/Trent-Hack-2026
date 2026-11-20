import { Pencil, SearchX } from "lucide-react";

import { pounds, shortMoney } from "@/lib/dibs/format";
import type { Housemate } from "@/lib/dibs/housemates";
import type { Shortfall } from "@/lib/dibs/types";

interface NoFitScreenProps {
  people: Housemate[];
  shortfall: Shortfall;
  onEdit: () => void;
}

export function NoFitScreen({ people, shortfall, onEdit }: NoFitScreenProps) {
  let headline: string;
  let detail: string;
  if (shortfall.kind === "limits-sum") {
    headline = `Your limits add up to ${pounds(shortfall.limitsTotalPence)} but the rent is ${pounds(shortfall.rentPence)}.`;
    detail = "No split can work until the limits cover the rent, or you find a cheaper house.";
  } else if (shortfall.kind === "person") {
    const p = people[shortfall.person];
    const isYou = shortfall.person === 0 && p?.name === "You";
    const who = isYou ? "You're" : `${p?.name ?? "Someone"} is`;
    headline = `No split is fair and within everyone's limit. ${who} ${shortMoney(shortfall.shortByPence)} a week short.`;
    detail = `With a limit of ${pounds(shortfall.minLimitPence)}, a fair split fits. Chip in, adjust answers, or try a cheaper house.`;
  } else {
    headline = "No split is fair and within everyone's limit.";
    detail = "Raising limits or a cheaper house would help.";
  }

  return (
    <div className="space-y-6 pt-4">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-soft"
        aria-hidden="true"
      >
        <SearchX className="h-8 w-8 text-destructive" />
      </span>
      <div className="space-y-3" role="status">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">{headline}</h1>
        <p className="text-lg text-muted-foreground">{detail}</p>
      </div>
      <p className="rounded-xl bg-secondary/60 p-3 text-sm">
        Dibs tells you when the numbers can&apos;t work, instead of handing someone a room they
        can&apos;t afford.
      </p>
      <button
        type="button"
        onClick={onEdit}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      >
        <Pencil className="h-5 w-5" aria-hidden="true" /> Edit answers
      </button>
    </div>
  );
}
