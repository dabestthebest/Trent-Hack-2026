import { AlertTriangle, ArrowRight, Bot, Home, Smartphone, Users } from "lucide-react";

import { equalSplitOverLimit } from "@/lib/dibs/fairSplit";
import { HOUSE, RENT_POUNDS, ROOMS } from "@/lib/dibs/fixture";
import { pounds } from "@/lib/dibs/format";
import { toSplitInput, type Housemate, type Mode } from "@/lib/dibs/housemates";

interface HouseScreenProps {
  people: Housemate[];
  mode: Mode;
  humans: 2 | 3;
  onModeChange: (mode: Mode, humans: 2 | 3) => void;
  onStart: () => void;
}

export function HouseScreen({ people, mode, humans, onModeChange, onStart }: HouseScreenProps) {
  const equalPence = (RENT_POUNDS * 100) / 3;
  const over = equalSplitOverLimit(toSplitInput(people));

  return (
    <div className="space-y-6">
      <header className="space-y-3 pt-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
          <Home className="h-4 w-4" aria-hidden="true" /> {HOUSE.name} · {HOUSE.area}
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
          Who gets the big room?
        </h1>
        <p className="text-lg text-muted-foreground">
          Dibs splits rooms and rent for student housemates so nobody wants to swap and nobody pays
          more than they can afford.
        </p>
      </header>

      <section
        aria-labelledby="house-heading"
        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="house-heading" className="font-display text-xl font-semibold">
            {HOUSE.bedrooms} bedrooms
          </h2>
          <p className="text-right">
            <span className="font-display text-2xl font-bold tabular-nums">
              {pounds(RENT_POUNDS * 100)}
            </span>
            <span className="text-sm text-muted-foreground"> /week total</span>
          </p>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {ROOMS.map((room) => (
            <li key={room.id} className="flex items-center gap-3 py-2.5">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-2xl"
                aria-hidden="true"
              >
                {room.emoji}
              </span>
              <div>
                <p className="font-medium">{room.name}</p>
                <p className="text-sm text-muted-foreground">{room.blurb}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="What an equal split would do"
        className="rounded-2xl border-2 border-destructive/40 bg-warning-soft p-4"
      >
        <p className="flex items-start gap-2 font-medium text-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <span>
            Split equally: everyone pays {pounds(equalPence)}.{" "}
            {over.length === 0
              ? "That ignores who gets the box room."
              : over
                  .map((o) => {
                    const p = people[o.person];
                    if (p === undefined) return "";
                    const limit = p.limitPounds;
                    const who = p.name === "You" && o.person === 0 ? "Your" : `${p.name}'s`;
                    const subject = p.name === "You" && o.person === 0 ? "you're" : `${p.name} is`;
                    return `${who} limit is £${limit}, so ${subject} ${pounds(o.overByPence)} over.`;
                  })
                  .join(" ")}
          </span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          And the box-room person pays the same as the bay window.
        </p>
      </section>

      <section aria-labelledby="who-heading" className="space-y-3">
        <h2 id="who-heading" className="font-display text-xl font-semibold">
          Who&apos;s in?
        </h2>
        <div role="radiogroup" aria-label="How you want to play" className="grid grid-cols-2 gap-2">
          <ModeButton
            selected={mode === "bots"}
            onClick={() => onModeChange("bots", humans)}
            icon={<Bot className="h-5 w-5" aria-hidden="true" />}
            title="Play vs bots"
            subtitle="You + Sam + Alex"
          />
          <ModeButton
            selected={mode === "pass"}
            onClick={() => onModeChange("pass", humans)}
            icon={<Smartphone className="h-5 w-5" aria-hidden="true" />}
            title="Pass the phone"
            subtitle="Answer in secret"
          />
        </div>
        {mode === "pass" ? (
          <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
            <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">People playing:</span>
            <div role="radiogroup" aria-label="People playing" className="flex gap-2">
              {([2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={humans === n}
                  onClick={() => onModeChange("pass", n)}
                  className={`h-10 w-12 rounded-lg border text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    humans === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <ul className="space-y-2">
          {people.map((p, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
            >
              <Avatar name={p.name} bot={p.isBot} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {p.name}{" "}
                  {p.isBot ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      · bot housemate
                    </span>
                  ) : null}
                </p>
                {p.blurb ? <p className="text-sm text-muted-foreground">{p.blurb}</p> : null}
                <p className="mt-1 text-sm">
                  {p.isBot ? (
                    <>
                      {p.limitOn ? `Limit £${p.limitPounds}/week` : "No weekly limit"} ·{" "}
                      <span className="text-muted-foreground">
                        room answers hidden until the reveal
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      Answers in secret on the next screen
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Weekly limits are shown to the whole house, so nobody can lowball theirs. Room preferences
          stay secret.
        </p>
      </section>

      <button
        type="button"
        onClick={onStart}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      >
        Start <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function ModeButton(props: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      onClick={props.onClick}
      className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        props.selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:bg-secondary/60"
      }`}
    >
      <span className="flex items-center gap-2 font-semibold">
        {props.icon}
        {props.title}
      </span>
      <span className="text-sm text-muted-foreground">{props.subtitle}</span>
    </button>
  );
}

export function Avatar({ name, bot }: { name: string; bot: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${
        bot ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
      }`}
    >
      {initial}
    </span>
  );
}
