import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

// Ad space on the blog. We have no advertisers yet, so the slot shows "house ads" for our own
// tools, labelled as such. Which ad shows is picked from the page (no randomness), so the
// server and the browser render the same thing.

export interface HouseAdCopy {
  id: "dibs" | "bills" | "penny";
  emoji: string;
  headline: string;
  body: string;
  cta: string;
}

export const HOUSE_ADS: readonly HouseAdCopy[] = [
  {
    id: "dibs",
    emoji: "🏠",
    headline: "Who gets the big room?",
    body: "Dibs splits rooms and rent so nobody wants to swap and nobody pays more than they can afford.",
    cta: "Try Dibs",
  },
  {
    id: "bills",
    emoji: "🧾",
    headline: "Who owes for the Tesco shop?",
    body: "Log shared bills, see who owes who, and send the settle-up to the house chat in one tap.",
    cta: "Split shared bills",
  },
  {
    id: "penny",
    emoji: "🪙",
    headline: "Get a money check from Penny",
    body: "Penny AI looks at your runway and gives you three quick tips. Only your numbers go to the AI.",
    cta: "Ask Penny AI",
  },
];

/** Deterministic pick: the same slot on the same page always shows the same ad. */
export function houseAdFor(seed: string): HouseAdCopy {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HOUSE_ADS[h % HOUSE_ADS.length] ?? (HOUSE_ADS[0] as HouseAdCopy);
}

const CTA_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50";

export function HouseAd({ seed }: { seed: string }) {
  const ad = houseAdFor(seed);
  return (
    <aside
      aria-label="Ad space"
      className="rounded-2xl border border-dashed border-border bg-card/80 p-4 shadow-sm"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Ad space · showing our own tools until advertisers join
      </p>
      <div className="mt-2 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl"
        >
          {ad.emoji}
        </span>
        <div className="min-w-0 space-y-2">
          <p className="font-display text-lg font-semibold leading-snug">{ad.headline}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{ad.body}</p>
          {ad.id === "dibs" ? (
            <Link to="/dibs" search={{ tab: "rooms" }} className={CTA_CLASS}>
              {ad.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : ad.id === "bills" ? (
            <Link to="/dibs" search={{ tab: "bills" }} className={CTA_CLASS}>
              {ad.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/" className={CTA_CLASS}>
              {ad.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
