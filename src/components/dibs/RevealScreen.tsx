import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  Check,
  CircleCheck,
  ClipboardCopy,
  Info,
  Minus,
  OctagonX,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { AskParent } from "@/components/money/AskParent";
import { Field } from "@/components/money/fields";
import { parseDate } from "@/components/money/parse";
import { TONE_BOX } from "@/components/money/styles";
import { challenge, pricesByPerson, settleUp } from "@/lib/dibs/fairSplit";
import {
  HOUSE,
  MEAL_DEAL_PENCE,
  RENT_POUNDS,
  ROOMS,
  UPFRONT_DEFAULT_WEEKS,
  UPFRONT_MAX_WEEKS,
  UPFRONT_MIN_WEEKS,
} from "@/lib/dibs/fixture";
import { mealDeals, nameInSentence, pounds, possessive, signedPounds } from "@/lib/dibs/format";
import { toSplitInput, type Housemate } from "@/lib/dibs/housemates";
import type { FeasibleSplit } from "@/lib/dibs/types";
import { impactPhraseFor, poundsWithCommas } from "@/lib/money/askParent";
import { addDays } from "@/lib/money/dates";
import { HOLDING_DEPOSIT_DAYS_AHEAD } from "@/lib/money/fixture";
import { previewPlan } from "@/lib/money/runway";
import { useMoney } from "@/lib/money/store";
import type { ISODate, Plan, PlanPreview, Verdict } from "@/lib/money/types";
import { cn } from "@/lib/utils";

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

      <div className="relative">
        <ol className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Rooms and rents">
          {ROOMS.map((room, r) => {
            const occupant = split.occupantOf[r] ?? 0;
            const person = people[occupant];
            const price = split.pricePence[r] ?? 0;
            const viewerRoom = split.roomOf[viewer];
            const canChallenge = flipped && r !== viewerRoom;
            const withinLimit = person?.limitOn ? price <= person.limitPounds * 100 : null;
            const limitNote =
              withinLimit === null ? " No limit." : withinLimit ? " Within limit." : " Over limit.";
            return (
              <li key={room.id} className="flip-card h-52 sm:h-56">
                <button
                  type="button"
                  onClick={() => (canChallenge ? setTarget(r) : undefined)}
                  aria-disabled={!canChallenge}
                  aria-label={
                    flipped
                      ? `${room.name}: ${person?.name ?? ""}, ${pounds(price)} per week.${limitNote}${canChallenge ? ` Tap to compare with ${possessive(nameOf(viewer), isYou(viewer))} room.` : ""}`
                      : `${room.name}: revealing`
                  }
                  className={`flip-inner relative h-full w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 ${flipped ? "is-flipped" : ""}`}
                  style={{ transitionDelay: `${r * 180}ms` }}
                >
                  <span
                    aria-hidden="true"
                    className="flip-face absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 bg-secondary p-2"
                  >
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
        {flipped ? <RevealConfetti /> : null}
      </div>

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
        <h2 id="vs-equal" className="font-display text-lg font-semibold leading-snug">
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
                  ≈ {mealDeals(t.amountPence, MEAL_DEAL_PENCE)} meal deals a week (at about £4 each)
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SigningCard weeklyRentPence={personPrices[0] ?? 0} />

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

type PayMode = "deposit" | "upfront";

const PAY_MODES: readonly { id: PayMode; label: string }[] = [
  { id: "deposit", label: "Holding deposit" },
  { id: "upfront", label: "Pay rent upfront" },
];

const IMPACT_STYLE: Record<Verdict, { icon: typeof CircleCheck; tone: string }> = {
  fine: { icon: CircleCheck, tone: TONE_BOX.own },
  overdraft: { icon: TriangleAlert, tone: TONE_BOX.overdraft },
  exhausted: { icon: OctagonX, tone: TONE_BOX.exhausted },
  "outside-window": { icon: CalendarClock, tone: "bg-secondary text-secondary-foreground" },
};

const SIGNING_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function weekCount(n: number): string {
  return `${n} ${n === 1 ? "week" : "weeks"}`;
}

/** impactPhrase speaks as the student to a parent ("my overdraft"); the card speaks to the student. */
function toSecondPerson(phrase: string): string {
  return phrase.replace(/\bmy\b/g, "your").replace(/\bme\b/g, "you");
}

function impactSentence(preview: PlanPreview, impact: string | null): string {
  if (preview.verdict === "fine") return "You can afford this before loan day.";
  if (preview.verdict === "outside-window") return "That's after loan day.";
  return `Paying this would ${toSecondPerson(impact ?? "take me further into my overdraft")}.`;
}

/**
 * Til Loan Day hand-off for person 0: either the holding deposit (capped at one week's rent) or
 * several weeks of rent paid upfront. Shows what it does to the runway, previews it on "/", and
 * offers a ready-made message to ask a parent. Hidden until the client knows today's date (null
 * during server rendering).
 */
function SigningCard({ weeklyRentPence }: { weeklyRentPence: number }) {
  const { today, runwayInput, setPendingPlan } = useMoney();
  const navigate = useNavigate();
  const [mode, setMode] = useState<PayMode>("deposit");
  const [weeks, setWeeks] = useState(UPFRONT_DEFAULT_WEEKS);
  // null until the student touches the date, so the default can follow `today` once it's known.
  const [dateInput, setDateInput] = useState<string | null>(null);
  // The last date that passed validation, so the parent message keeps a real date while the
  // student is mid-edit.
  const [lastGoodDate, setLastGoodDate] = useState<ISODate | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // The runway engine only accepts whole pence.
  const weeklyPence = Math.round(weeklyRentPence);
  if (today === null || weeklyPence <= 0) return null;

  const checkDate = (raw: string) =>
    parseDate(raw, { min: today, minMessage: "Pick today or a later date." });
  // Upfront rent can only be paid after everyone has signed, so default it a little later.
  const defaultDate = addDays(today, mode === "upfront" ? 14 : HOLDING_DEPOSIT_DAYS_AHEAD);
  const dateValue = dateInput ?? defaultDate;
  const parsedDate = checkDate(dateValue);

  const upfront = mode === "upfront";
  const amountPence = upfront ? weeklyPence * weeks : weeklyPence;
  const amountText = poundsWithCommas(amountPence);
  const weeklyText = poundsWithCommas(weeklyPence);
  const plan: Plan = {
    label: upfront ? `Rent upfront (${weekCount(weeks)})` : "Holding deposit",
    amountPence,
    date: parsedDate.ok ? parsedDate.value : (lastGoodDate ?? defaultDate),
  };
  const preview = parsedDate.ok && runwayInput ? previewPlan(runwayInput, plan) : null;
  // With no arranged overdraft, "use up my whole overdraft" would be wrong: impactPhraseFor says what happens.
  const impact =
    preview === null ? null : impactPhraseFor(preview, runwayInput?.overdraftPence ?? 0);
  const impactStyle = preview ? IMPACT_STYLE[preview.verdict] : null;
  const ImpactIcon = impactStyle?.icon;

  const selectMode = (index: number) => {
    const next = PAY_MODES[(index + PAY_MODES.length) % PAY_MODES.length];
    if (!next) return;
    setMode(next.id);
    radioRefs.current[PAY_MODES.indexOf(next)]?.focus();
  };

  const onRadioKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      selectMode(index + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      selectMode(index - 1);
    }
  };

  const goPreview = () => {
    if (!parsedDate.ok) {
      dateRef.current?.focus();
      return;
    }
    setPendingPlan(plan);
    void navigate({ to: "/" });
  };

  return (
    <section
      aria-labelledby="deposit-heading"
      className="space-y-4 rounded-2xl border-2 border-accent bg-accent/25 p-4"
    >
      <h2 id="deposit-heading" className="font-display text-xl font-semibold">
        <span aria-hidden="true">🏡</span> Signing for this house?
      </h2>

      <div
        role="radiogroup"
        aria-label="What are you paying?"
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/70 p-1"
      >
        {PAY_MODES.map((m, i) => {
          const selected = mode === m.id;
          return (
            <button
              key={m.id}
              ref={(el) => {
                radioRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setMode(m.id)}
              onKeyDown={(e) => onRadioKey(e, i)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-center text-sm font-semibold leading-tight transition",
                SIGNING_FOCUS,
                selected
                  ? "bg-foreground text-background shadow-sm"
                  : "text-foreground hover:bg-secondary",
              )}
            >
              {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
              {m.label}
            </button>
          );
        })}
      </div>

      {upfront ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            Some students prefer to pay housing upfront in one go. Split the Dibs way, your rent is{" "}
            <strong className="font-semibold tabular-nums">{weeklyText}</strong> a week.
          </p>
          <p className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            In England, for most private lets agreed from 1 May 2026, a landlord can&apos;t ask for
            or accept rent before the tenancy is signed, and can ask for at most a month&apos;s rent
            in advance after that (Renters&apos; Rights Act 2025). Paying more upfront has to be
            your own choice, after signing. Halls can have different rules. Not legal advice.
          </p>
          <WeeksStepper value={weeks} onChange={setWeeks} />
          <p className="rounded-xl bg-background/70 px-3 py-2.5 text-center font-display text-lg font-semibold tabular-nums">
            {`${weekCount(weeks)} × ${weeklyText} = ${amountText}`}
          </p>
        </div>
      ) : (
        <p className="text-sm leading-relaxed">
          In England a holding deposit is capped at one week&apos;s rent per tenancy (Tenant Fees
          Act 2019), so on a joint tenancy it&apos;s at most {pounds(RENT_POUNDS * 100)} for the
          whole house. Split the Dibs way, your share is{" "}
          <strong className="font-semibold tabular-nums">{amountText}</strong>. See what paying it
          does to your money before loan day.
        </p>
      )}

      <Field
        label={upfront ? "When would you pay it (after signing)?" : "When would you pay it?"}
        type="date"
        inputRef={dateRef}
        value={dateValue}
        min={today}
        error={parsedDate.ok ? null : parsedDate.error}
        onChange={(e) => {
          const raw = e.target.value;
          setDateInput(raw);
          const checked = checkDate(raw);
          if (checked.ok) setLastGoodDate(checked.value);
        }}
      />

      <div aria-live="polite" aria-atomic="true">
        {preview && impactStyle && ImpactIcon ? (
          <p
            className={cn(
              "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
              impactStyle.tone,
            )}
          >
            <ImpactIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{impactSentence(preview, impact)}</span>
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={goPreview}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-center font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      >
        {`Preview ${amountText} in Til Loan Day`}
        <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
      </button>

      <AskParent
        variant="button"
        bill={plan}
        impact={impact}
        loanDate={runwayInput?.loanDate ?? null}
        optional={upfront}
      />
    </section>
  );
}

/** Whole weeks, 1–52, with − / + buttons and a box you can type in. */
function WeeksStepper({ value, onChange }: { value: number; onChange: (weeks: number) => void }) {
  const id = useId();
  const hintId = `${id}-hint`;
  // What the student is typing while the box has focus; null shows the committed value.
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(UPFRONT_MAX_WEEKS, Math.max(UPFRONT_MIN_WEEKS, n));
  const atMin = value <= UPFRONT_MIN_WEEKS;
  const atMax = value >= UPFRONT_MAX_WEEKS;

  const bump = (delta: number) => {
    setDraft(null);
    onChange(clamp(value + delta));
  };

  const buttonClass = cn(
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-secondary aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-card",
    SIGNING_FOCUS,
  );

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        How many weeks?
      </label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <button
          type="button"
          aria-label="One week fewer"
          aria-disabled={atMin}
          onClick={() => (atMin ? undefined : bump(-1))}
          className={buttonClass}
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={draft ?? String(value)}
            aria-describedby={hintId}
            onFocus={() => setDraft(String(value))}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
              setDraft(digits);
              if (digits !== "") onChange(clamp(Number(digits)));
            }}
            onBlur={() => setDraft(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              else if (e.key === "ArrowUp" && !atMax) {
                e.preventDefault();
                onChange(clamp(value + 1));
                setDraft(String(clamp(value + 1)));
              } else if (e.key === "ArrowDown" && !atMin) {
                e.preventDefault();
                onChange(clamp(value - 1));
                setDraft(String(clamp(value - 1)));
              }
            }}
            className="h-12 w-full min-w-0 rounded-xl border border-input bg-background px-14 text-center text-lg font-semibold tabular-nums text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            {value === 1 ? "week" : "weeks"}
          </span>
        </div>
        <button
          type="button"
          aria-label="One week more"
          aria-disabled={atMax}
          onClick={() => (atMax ? undefined : bump(1))}
          className={buttonClass}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p id={hintId} className="mt-1 text-xs text-muted-foreground">
        Whole weeks, {UPFRONT_MIN_WEEKS} to {UPFRONT_MAX_WEEKS}.
      </p>
    </div>
  );
}

/** Custom properties consumed by `.reveal-confetti > span` in styles.css. */
type ConfettiStyle = CSSProperties & Record<`--${string}`, string>;

const CONFETTI_COLOURS = [
  "var(--primary)",
  "var(--accent)",
  "var(--success)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Fixed (not random) so server and client markup always match. One burst per card column.
const CONFETTI: { sx: number; dx: number; dy: number; rot: number; delay: number }[] = [
  { sx: 16, dx: -34, dy: -120, rot: 260, delay: 0 },
  { sx: 18, dx: 22, dy: -150, rot: -200, delay: 40 },
  { sx: 14, dx: -10, dy: -95, rot: 320, delay: 90 },
  { sx: 20, dx: 40, dy: -110, rot: 180, delay: 60 },
  { sx: 17, dx: -46, dy: -70, rot: -280, delay: 120 },
  { sx: 48, dx: -28, dy: -160, rot: 240, delay: 160 },
  { sx: 50, dx: 30, dy: -135, rot: -300, delay: 200 },
  { sx: 52, dx: 6, dy: -175, rot: 200, delay: 180 },
  { sx: 47, dx: -52, dy: -90, rot: -220, delay: 240 },
  { sx: 53, dx: 54, dy: -85, rot: 300, delay: 220 },
  { sx: 82, dx: 30, dy: -125, rot: -260, delay: 320 },
  { sx: 84, dx: -24, dy: -150, rot: 220, delay: 360 },
  { sx: 80, dx: 8, dy: -100, rot: -320, delay: 340 },
  { sx: 86, dx: 44, dy: -75, rot: 260, delay: 400 },
  { sx: 83, dx: -44, dy: -105, rot: -180, delay: 380 },
];

/** A one-off burst as the cards land. Decorative, CSS-only, hidden for prefers-reduced-motion. */
function RevealConfetti() {
  return (
    <div
      aria-hidden="true"
      className="reveal-confetti pointer-events-none absolute -inset-x-2 -bottom-2 -top-20 z-10 overflow-hidden"
    >
      {CONFETTI.map((p, i) => {
        const style: ConfettiStyle = {
          "--sx": `${p.sx}%`,
          "--dx": `${p.dx}px`,
          "--dy": `${p.dy}px`,
          "--rot": `${p.rot}deg`,
          "--c": CONFETTI_COLOURS[i % CONFETTI_COLOURS.length] ?? "var(--primary)",
          "--delay": `${800 + p.delay}ms`,
        };
        return <span key={i} style={style} />;
      })}
    </div>
  );
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
