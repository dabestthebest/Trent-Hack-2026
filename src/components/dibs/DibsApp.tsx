import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { solveFairSplit } from "@/lib/dibs/fairSplit";
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

  let screen: React.ReactNode;
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">
        <nav className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => go({ kind: "house" })}
            className="font-display text-2xl font-extrabold tracking-tight text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Dibs, back to the house"
          >
            dibs<span className="text-foreground">.</span>
          </button>
          <span className="text-sm text-muted-foreground">Fair rooms. Rents you can afford.</span>
        </nav>
        <main>{screen}</main>
        <footer className="mt-10 space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>
            Fair rent maths after Spliddit (CMU) and &ldquo;Fair Rent Division on a Budget&rdquo;
            (Procaccia, Velez &amp; Yu, AAAI 2018). Demo house and housemates are fictional. Runs
            entirely in your browser.
          </p>
          <p>
            <Link to="/selftest" className="underline underline-offset-2 hover:text-foreground">
              selftest
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
