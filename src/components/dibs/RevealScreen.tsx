import {
  ArrowLeftRight,
  Check,
  ClipboardCopy,
  Info,
  Pencil,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { challenge, pricesByPerson, settleUp } from "@/lib/dibs/fairSplit";
import { HOUSE, MEAL_DEAL_PENCE, RENT_POUNDS, ROOMS } from "@/lib/dibs/fixture";
import { mealDeals, nameInSentence, pounds, possessive, signedPounds } from "@/lib/dibs/format";
import { toSplitInput, type Housemate } from "@/lib/dibs/housemates";
import type { FeasibleSplit } from "@/lib/dibs/types";

import { Avatar } from "./HouseScreen";

interface RevealScreenProps {
  people: Housemate[];
  split: FeasibleSplit;
  onEdit: () => void;
  onRestart: () => void;
}

export function RevealScreen({ people, split, onEdit, onRestart }: RevealScreenProps) {
  const [flipped, setFlipped] = useState(false);
  const [viewer, setViewer] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setFlipped(true), 350);
    return () => window.clearTimeout(t);
  }, []);

  const input = toSplitInput(people);
  const equalPence = (RENT_POUNDS * 100) / 3;
  const personPrices = pricesByPerson(split);
  const transfers = settleUp(personPrices, equalPence);
  const anyLimit = people.some((p) => p.limitOn);
  const nameOf = (i: number) => people[i]?.name ?? `Person ${i + 1}`;
  const isYou = (i: number) => i === 0 && nameOf(0) === "You";

  if (!split.verified) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-destructive/40 bg-warning-soft p-5">
        <h1 className="font-display text-2xl font-bold">Couldn&apos;t verify a fair split</h1>
        <p>
          Something didn&apos;t add up when we double-checked the numbers, so we&apos;re not showing
          a result.
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
        >
          Edit answers
        </button>
      </div>
    );
  }

  const copyText = buildCopyText(people, split, transfers, anyLimit);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = copyText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const binding = split.bindingLimits.map((i) => {
    const p = people[i];
    return p
      ? `${isYou(i) ? "Your" : possessive(p.name, false).replace(/^./, (c) => c.toUpperCase())} £${p.limitPounds} limit shaped this split.`
      : "";
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1 pt-2">
        <p className="text-sm font-medium text-muted-foreground">
          {HOUSE.name} · {pounds(RENT_POUNDS * 100)}/week
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Here&apos;s the fair split
        </h1>
      </header>

      <ol className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Rooms and rents">
        {ROOMS.map((room, r) => {
          const occupant = split.occupantOf[r] ?? 0;
          const person = people[occupant];
          const price = split.pricePence[r] ?? 0;
          const viewerRoom = split.roomOf[viewer];
          const canChallenge = flipped && r !== viewerRoom;
          const withinLimit = person?.limitOn ? price <= person.limitPounds * 100 : null;
          return (
            <li key={room.id} className="flip-card h-52 sm:h-56">
              <button
                type="button"
                onClick={() => (canChallenge ? setTarget(r) : undefined)}
                aria-disabled={!canChallenge}
                aria-label={
                  flipped
                    ? `${room.name}: ${person?.name ?? ""}, ${pounds(price)} per week.${canChallenge ? ` Tap to compare with ${possessive(nameOf(viewer), isYou(viewer))} room.` : ""}`
                    : `${room.name}: revealing`
                }
                className={`flip-inner relative h-full w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 ${flipped ? "is-flipped" : ""}`}
                style={{ transitionDelay: `${r * 180}ms` }}
              >
                <span className="flip-face absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 bg-secondary p-2">
                  <span className="text-4xl" aria-hidden="true">
                    {room.emoji}
                  </span>
                  <span className="text-center text-sm font-semibold leading-tight">
                    {room.name}
                  </span>
                  <span className="font-display text-2xl font-bold text-primary">?</span>
                </span>
                <span
                  className={`flip-face flip-back absolute inset-0 flex flex-col justify-between rounded-2xl border-2 bg-card p-2.5 shadow-md sm:p-3 ${
                    r === viewerRoom ? "border-primary" : "border-border"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-2xl" aria-hidden="true">
                      {room.emoji}
                    </span>
                    {canChallenge ? (
                      <ArrowLeftRight
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm sm:normal-case sm:tracking-normal">
                    {room.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Avatar name={person?.name ?? "?"} bot={person?.isBot ?? false} />
                    <span className="truncate font-semibold">{person?.name}</span>
                  </span>
                  <span>
                    <span className="block font-display text-xl font-bold tabular-nums sm:text-2xl">
                      {pounds(price)}
                    </span>
                    <span className="text-xs text-muted-foreground">per week</span>
                  </span>
                  <span className="text-xs font-medium">
                    {withinLimit === null ? (
                      <span className="text-muted-foreground">No limit</span>
                    ) : withinLimit ? (
                      <span className="inline-flex items-center gap-0.5 text-success">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Within limit
                      </span>
                    ) : (
                      <span className="text-destructive">Over limit</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <ul
        className={`space-y-2 transition-opacity duration-500 ${flipped ? "opacity-100" : "opacity-0"}`}
        aria-label="Checks"
      >
        <Badge text={`Rents add up to ${pounds(RENT_POUNDS * 100)}`} />
        <Badge text="Nobody would rather have another room at its price" />
        {anyLimit ? <Badge text="Everyone is within their limit" /> : null}
      </ul>
      <p className="-mt-3 text-xs text-muted-foreground">
        Checked: nobody gains more than 1p by switching. All by each person&apos;s own answers.
      </p>

      {binding.length > 0 ? (
        <p className="flex items-start gap-2 rounded-xl bg-accent/40 p-3 text-sm font-medium">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{binding.join(" ")}</span>
        </p>
      ) : null}

      <section aria-labelledby="vs-equal" className="rounded-2xl border border-border bg-card p-4">
        <h2 id="vs-equal" className="font-semibold">
          Compared with splitting equally ({pounds(equalPence)} each)
        </h2>
        <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
          {people.map((p, i) => {
            const d = Math.round((personPrices[i] ?? 0) - equalPence);
            return (
              <li key={i} className="rounded-xl bg-secondary/60 p-2">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span
                  className={`font-display text-lg font-bold tabular-nums ${d < 0 ? "text-success" : d > 0 ? "text-foreground" : ""}`}
                >
                  {signedPounds(d)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="challenge-heading"
        className="space-y-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4"
      >
        <h2 id="challenge-heading" className="font-display text-xl font-semibold">
          Think you got a bad deal?
        </h2>
        <p className="text-sm">Tap the room you&apos;d take instead and see the maths.</p>
        {people.length > 1 ? (
          <div role="radiogroup" aria-label="Check as" className="flex flex-wrap gap-2">
            {people.map((p, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={viewer === i}
                onClick={() => {
                  setViewer(i);
                  setTarget(null);
                }}
                className={`h-9 rounded-full border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  viewer === i
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {isYou(i) ? "Me" : p.name}
              </button>
            ))}
          </div>
        ) : null}
        {target !== null ? (
          <ChallengeCard
            text={challengeSentence(people, split, viewer, target)}
            onClose={() => setTarget(null)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Checking as {isYou(viewer) ? "you" : nameOf(viewer)}. Tap another room card above.
          </p>
        )}
      </section>

      <section
        aria-labelledby="settle-heading"
        className="rounded-2xl border border-border bg-card p-4"
      >
        <h2 id="settle-heading" className="font-display text-xl font-semibold">
          Settle up
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your contract probably charges {pounds(equalPence)} each. To make it fair:
        </p>
        {transfers.length === 0 ? (
          <p className="mt-2 font-medium">Nothing to settle: everyone pays the same.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {transfers.map((t, k) => (
              <li key={k} className="rounded-xl bg-secondary/60 p-3">
                <p className="font-semibold">
                  {nameOf(t.from)} sends {nameInSentence(nameOf(t.to), t.to === 0)}{" "}
                  {pounds(t.amountPence)}/week
                </p>
                <p className="text-sm text-muted-foreground">
                  ≈ {mealDeals(t.amountPence, MEAL_DEAL_PENCE)} meal deals a week
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <button
          type="button"
          aria-expanded={showAnswers}
          onClick={() => setShowAnswers((s) => !s)}
          className="flex w-full items-center justify-between p-4 text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          See everyone&apos;s answers <span aria-hidden="true">{showAnswers ? "−" : "+"}</span>
        </button>
        {showAnswers ? (
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 font-medium">Who</th>
                  <th className="py-1 font-medium">Middle</th>
                  <th className="py-1 font-medium">Double</th>
                  <th className="py-1 font-medium">Limit</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {people.map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1.5 font-medium">{p.name}</td>
                    <td>{p.middle >= 0 ? `+£${p.middle}` : `−£${-p.middle}`}</td>
                    <td>{p.double >= 0 ? `+£${p.double}` : `−£${-p.double}`}</td>
                    <td>{p.limitOn ? `£${p.limitPounds}` : "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              Premiums are per week, compared with the Box room.
            </p>
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={copy}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          <ClipboardCopy className="h-5 w-5" aria-hidden="true" />{" "}
          {copied ? "Copied!" : "Copy for the group chat"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil className="h-5 w-5" aria-hidden="true" /> Edit answers
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" /> Start over
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? "Result copied to clipboard" : ""}
      </p>
    </div>
  );

  function challengeSentence(
    ppl: Housemate[],
    s: FeasibleSplit,
    who: number,
    room: number,
  ): string {
    const c = challenge(input, s, who, room);
    const p = ppl[who];
    const roomName = ROOMS[room]?.name ?? "That room";
    const you = isYou(who);
    const whose = possessive(p?.name ?? "", you);
    const subj = you ? "You" : (p?.name ?? "They");
    const parts: string[] = [];
    const cost = c.costDiffPence;
    parts.push(
      cost === 0
        ? `The ${roomName} costs the same as ${whose} room.`
        : `The ${roomName} costs ${pounds(Math.abs(cost))} ${cost > 0 ? "more" : "less"} than ${whose} room.`,
    );
    const worth = c.worthDiffPence;
    parts.push(
      worth === 0
        ? `${subj} said it's worth the same.`
        : `${subj} said it's worth £${Math.abs(worth / 100)} ${worth > 0 ? "more" : "less"}${you ? " to you" : ""}.`,
    );
    if (c.betterOffStayingPence > 1) {
      parts.push(
        `So ${you ? "you're" : `${p?.name ?? "they"} is`} ${pounds(c.betterOffStayingPence)} better off where ${you ? "you are" : "they are"}.`,
      );
    } else {
      parts.push(`So ${you ? "you'd" : `${p?.name ?? "they"} would`} be equally happy either way.`);
    }
    if (c.overLimitPence > 0 && p?.limitOn) {
      parts.push(
        `It would also be ${pounds(c.overLimitPence)} over ${whose} £${p.limitPounds} limit.`,
      );
    }
    return parts.join(" ");
  }
}

function Badge({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 font-semibold text-success-strong">
      <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>
        <span aria-hidden="true">✓ </span>
        {text}
      </span>
    </li>
  );
}

function ChallengeCard({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div
      role="status"
      className="relative rounded-xl border border-border bg-card p-4 pr-10 shadow-sm"
    >
      <p className="text-base leading-relaxed">{text}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close comparison"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function buildCopyText(
  people: Housemate[],
  split: FeasibleSplit,
  transfers: { from: number; to: number; amountPence: number }[],
  anyLimit: boolean,
): string {
  const lines = [`Dibs: ${HOUSE.name}, ${HOUSE.area} (${pounds(RENT_POUNDS * 100)}/week)`];
  ROOMS.forEach((room, r) => {
    const who = people[split.occupantOf[r] ?? 0]?.name ?? "?";
    lines.push(`${room.emoji} ${room.name}: ${who} ${pounds(split.pricePence[r] ?? 0)}/wk`);
  });
  lines.push(
    `✓ Adds up to ${pounds(RENT_POUNDS * 100)} ✓ Nobody would rather swap${anyLimit ? " ✓ Everyone within their limit" : ""}`,
  );
  if (transfers.length > 0) {
    const name = (i: number) => people[i]?.name ?? "?";
    lines.push(
      `Settle-up (contract ${pounds((RENT_POUNDS * 100) / 3)} each): ${transfers
        .map((t) => `${name(t.from)} → ${name(t.to)} ${pounds(t.amountPence)}/wk`)
        .join("; ")}`,
    );
  }
  return lines.join("\n");
}
