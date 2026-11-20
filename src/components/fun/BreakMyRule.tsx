import { useId, useState } from "react";

import { judge, PUZZLES, type Outcome } from "@/lib/fun/breakMyRule";
import { cn } from "@/lib/utils";

/** A brain-break puzzle: find one test that two rules disagree on. */
export function BreakMyRule() {
  const id = useId();
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [tried, setTried] = useState<{ value: string; outcome: Outcome } | null>(null);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const puzzle = PUZZLES[index] ?? PUZZLES[0]!;
  const result = tried ? puzzle.check(tried.value) : null;

  const test = () => {
    const outcome = judge(puzzle, guess);
    setTried({ value: guess, outcome });
    if (outcome === "split") setSolved((s) => new Set(s).add(puzzle.id));
  };

  const pick = (i: number) => {
    setIndex(i);
    setGuess("");
    setTried(null);
  };

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Brain break · {solved.size}/{PUZZLES.length} solved
        </p>
        <h2 id={`${id}-heading`} className="font-display text-xl font-semibold">
          🧩 Break My Rule
        </h2>
        <p className="text-sm text-muted-foreground">
          Two rules agree almost all the time. Find one test that splits them, like a good test case
          pinning down a bug.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Puzzles"
        className="flex gap-1 rounded-xl bg-secondary/60 p-1"
      >
        {PUZZLES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => pick(i)}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              i === index ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            {solved.has(p.id) ? "✓ " : ""}
            {i + 1}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="font-semibold">{puzzle.title}</p>
        <p className="text-sm text-muted-foreground">{puzzle.story}</p>
        <ul className="grid gap-1.5 text-sm">
          <li className="rounded-lg border border-border bg-background/60 px-3 py-2">
            <span className="font-semibold">Rule A:</span> {puzzle.ruleA}
          </li>
          <li className="rounded-lg border border-border bg-background/60 px-3 py-2">
            <span className="font-semibold">Rule B:</span> {puzzle.ruleB}
          </li>
        </ul>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          test();
        }}
      >
        <label className="sr-only" htmlFor={`${id}-guess`}>
          {puzzle.inputLabel}
        </label>
        <input
          id={`${id}-guess`}
          value={guess}
          maxLength={40}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={`${puzzle.inputLabel}, e.g. ${puzzle.placeholder}`}
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={guess.length === 0}
          className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          Test it
        </button>
      </form>

      <div aria-live="polite">
        {tried && tried.outcome === "invalid" ? (
          <p className="text-sm font-medium text-destructive">That isn&apos;t a valid test here.</p>
        ) : null}
        {tried && result ? (
          <div
            className={cn(
              "space-y-1 rounded-xl px-3 py-2 text-sm",
              tried.outcome === "split" ? "bg-success-soft" : "bg-secondary/60",
            )}
          >
            <p>
              Rule A says <strong>{result.a ? "yes" : "no"}</strong> · Rule B says{" "}
              <strong>{result.b ? "yes" : "no"}</strong>
            </p>
            <p className="font-semibold">
              {tried.outcome === "split"
                ? "🎉 Rule broken! That one test tells them apart."
                : "They agree on that one. Try another test."}
            </p>
            {tried.outcome === "split" ? (
              <p className="text-muted-foreground">{puzzle.explain}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
