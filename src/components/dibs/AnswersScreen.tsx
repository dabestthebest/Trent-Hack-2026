import { ArrowLeft, Check, Lock } from "lucide-react";

import {
  LIMIT_MAX,
  LIMIT_MIN,
  NAME_MAX_LENGTH,
  PREMIUM_MAX,
  PREMIUM_MIN,
  ROOMS,
} from "@/lib/dibs/fixture";
import { wholePounds } from "@/lib/dibs/format";
import { hasErrors, validateHousemate, type Housemate } from "@/lib/dibs/housemates";

import { Avatar } from "./HouseScreen";
import { Stepper } from "./Stepper";

interface AnswersScreenProps {
  people: Housemate[];
  index: number;
  isPlayerOne: boolean;
  onChange: (next: Housemate) => void;
  onLockIn: () => void;
  onBack: () => void;
}

const premiumDisplay = (v: number) => (v > 0 ? `+£${v}` : v < 0 ? `−£${-v}` : "£0");

export function AnswersScreen({
  people,
  index,
  isPlayerOne,
  onChange,
  onLockIn,
  onBack,
}: AnswersScreenProps) {
  const me = people[index];
  if (me === undefined) return null;
  const errors = validateHousemate(me);
  const set = (patch: Partial<Housemate>) => onChange({ ...me, ...patch });
  const heading =
    isPlayerOne && me.name === "You" ? "Your answers" : `${me.name.trim() || "Your"}'s answers`;
  const middle = ROOMS[1];
  const double = ROOMS[2];
  const box = ROOMS[0];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the house
      </button>

      <header className="space-y-2">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Lock className="h-4 w-4" aria-hidden="true" /> Only you can see this screen
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{heading}</h1>
      </header>

      {!isPlayerOne || me.name !== "You" ? (
        <div className="space-y-1.5">
          <label htmlFor="name" className="font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            maxLength={NAME_MAX_LENGTH}
            value={me.name}
            onChange={(e) => set({ name: e.target.value })}
            aria-invalid={errors.name ? true : undefined}
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.name ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>
      ) : null}

      <section
        aria-labelledby="q-heading"
        className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <div>
          <h2 id="q-heading" className="font-display text-xl font-semibold leading-snug">
            How much more per week would you pay for each room than the {box?.name ?? "Box room"}?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {box?.emoji} The {box?.name ?? "Box room"} is your baseline. Go negative if you&apos;d
            want a room cheaper than it.
          </p>
        </div>
        <Stepper
          id="premium-middle"
          label={`${middle?.emoji ?? ""} ${middle?.name ?? "Middle room"}`}
          hint={middle?.blurb}
          value={me.middle}
          min={PREMIUM_MIN}
          max={PREMIUM_MAX}
          step={5}
          display={premiumDisplay}
          onChange={(v) => set({ middle: v })}
          error={errors.middle}
        />
        <Stepper
          id="premium-double"
          label={`${double?.emoji ?? ""} ${double?.name ?? "Big double"}`}
          hint={double?.blurb}
          value={me.double}
          min={PREMIUM_MIN}
          max={PREMIUM_MAX}
          step={5}
          display={premiumDisplay}
          onChange={(v) => set({ double: v })}
          error={errors.double}
        />
      </section>

      <section
        aria-labelledby="limit-heading"
        className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="limit-heading" className="font-display text-xl font-semibold">
              Weekly limit
            </h2>
            <p className="text-sm text-muted-foreground">
              The most you can pay per week. Shown to the whole house.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={me.limitOn}
            aria-labelledby="limit-heading"
            onClick={() => set({ limitOn: !me.limitOn })}
            className={`relative h-8 w-14 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              me.limitOn ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${me.limitOn ? "left-7" : "left-1"}`}
            />
            <span className="sr-only">{me.limitOn ? "On" : "Off"}</span>
          </button>
        </div>
        {me.limitOn ? (
          <Stepper
            id="limit"
            label="Most I can pay"
            value={me.limitPounds}
            min={LIMIT_MIN}
            max={LIMIT_MAX}
            step={5}
            display={(v) => `${wholePounds(v)}/wk`}
            onChange={(v) => set({ limitPounds: v })}
            error={errors.limit}
          />
        ) : (
          <p className="text-sm font-medium">No limit set.</p>
        )}
      </section>

      <BotStatus people={people} />

      <button
        type="button"
        onClick={onLockIn}
        disabled={hasErrors(errors)}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:opacity-50"
      >
        <Lock className="h-5 w-5" aria-hidden="true" /> Lock in
      </button>
    </div>
  );
}

function BotStatus({ people }: { people: Housemate[] }) {
  const bots = people.filter((p) => p.isBot);
  if (bots.length === 0) return null;
  return (
    <ul aria-label="Other housemates" className="flex flex-wrap gap-2">
      {bots.map((b) => (
        <li
          key={b.name}
          className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm"
        >
          <Avatar name={b.name} bot />
          <span className="font-medium">{b.name}</span>
          <span className="inline-flex items-center gap-1 text-success">
            <Check className="h-4 w-4" aria-hidden="true" /> locked in
          </span>
        </li>
      ))}
    </ul>
  );
}
