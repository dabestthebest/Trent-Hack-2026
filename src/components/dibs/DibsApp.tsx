import { useEffect, useMemo, useState, type ReactNode } from "react";

import { solveFairSplit } from "@/lib/dibs/fairSplit";
import { setDibsLock } from "@/lib/dibs/lock";
import { useFun } from "@/lib/fun/store";
import { initialHousemates, toSplitInput, type Housemate, type Mode } from "@/lib/dibs/housemates";

import { AnswersScreen } from "./AnswersScreen";
import { HouseScreen } from "./HouseScreen";
import { NoFitScreen } from "./NoFitScreen";
import { PrivacyScreen } from "./PrivacyScreen";
import { RevealScreen } from "./RevealScreen";

type Step =
  | { kind: "house" }
  | { kind: "answers"; index: number }
  | { kind: "privacy"; index: number }
  | { kind: "result" };

export function DibsApp() {
  const [mode, setMode] = useState<Mode>("bots");
  const [humans, setHumans] = useState<2 | 3>(2);
  const [people, setPeople] = useState<Housemate[]>(() => initialHousemates("bots", 2));
  const [step, setStep] = useState<Step>({ kind: "house" });

  const humanSeats = useMemo(
    () => people.map((p, i) => (p.isBot ? -1 : i)).filter((i) => i >= 0),
    [people],
  );
  const result = useMemo(
    () => (step.kind === "result" ? solveFairSplit(toSplitInput(people)) : null),
    [step, people],
  );
  // Pass-the-phone: lock the Runway so housemates can't peek at your balance. Not cleared on
  // unmount on purpose; coming back to Dibs starts at the house screen, which unlocks it.
  const passing = humanSeats.length > 1 && step.kind !== "house";
  useEffect(() => {
    setDibsLock(passing);
  }, [passing]);

  const { complete } = useFun();
  useEffect(() => {
    if (result?.feasible) complete("fair-split");
  }, [result, complete]);

  const go = (next: Step) => {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const changeMode = (m: Mode, h: 2 | 3) => {
    setMode(m);
    setHumans(h);
    setPeople(initialHousemates(m, h));
  };

  const lockIn = (index: number) => {
    const pos = humanSeats.indexOf(index);
    const next = humanSeats[pos + 1];
    if (next === undefined) go({ kind: "result" });
    else go({ kind: "privacy", index: next });
  };

  const firstHuman = humanSeats[0] ?? 0;

  let screen: ReactNode;
  if (step.kind === "house") {
    screen = (
      <HouseScreen
        people={people}
        mode={mode}
        humans={humans}
        onModeChange={changeMode}
        onStart={() => go({ kind: "answers", index: firstHuman })}
      />
    );
  } else if (step.kind === "answers") {
    screen = (
      <AnswersScreen
        key={step.index}
        people={people}
        index={step.index}
        isPlayerOne={step.index === 0 && mode === "bots"}
        onChange={(next) => setPeople((ps) => ps.map((p, i) => (i === step.index ? next : p)))}
        onLockIn={() => lockIn(step.index)}
        onBack={() => go({ kind: "house" })}
      />
    );
  } else if (step.kind === "privacy") {
    const nextName = people[step.index]?.name ?? "the next person";
    screen = (
      <PrivacyScreen
        nextName={nextName}
        onReady={() => go({ kind: "answers", index: step.index })}
      />
    );
  } else if (result === null) {
    screen = null;
  } else if (result.feasible) {
    screen = (
      <RevealScreen
        people={people}
        split={result}
        onEdit={() => go({ kind: "answers", index: firstHuman })}
        onRestart={() => {
          setPeople(initialHousemates(mode, humans));
          go({ kind: "house" });
        }}
      />
    );
  } else {
    screen = (
      <NoFitScreen
        people={people}
        shortfall={result.shortfall}
        onEdit={() => go({ kind: "answers", index: firstHuman })}
      />
    );
  }

  // Page chrome (header, nav, footer, <main>) comes from the AppShell; this is just the tool.
  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => go({ kind: "house" })}
          className="-mx-1.5 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="font-display text-xl font-extrabold tracking-tight text-primary">
            Dibs
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            <span aria-hidden="true">· </span>fair rooms and rent
          </span>
          <span className="sr-only">, back to the house</span>
        </button>
      </div>
      {passing ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm">
          <span>
            <span aria-hidden="true">🔒 </span>Runway locked while you pass the phone round.
          </span>
          <button
            type="button"
            onClick={() => go({ kind: "house" })}
            className="min-h-10 rounded-lg border border-border bg-card px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            End Dibs &amp; unlock
          </button>
        </div>
      ) : null}
      {screen}
    </div>
  );
}
