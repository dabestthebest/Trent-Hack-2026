import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { runAcceptance, type AcceptanceRow } from "@/lib/dibs/acceptance";
import { runRunwayAcceptance } from "@/lib/money/acceptance";

export const Route = createFileRoute("/selftest")({
  head: () => ({
    meta: [
      { title: "Selftest · Til Loan Day" },
      {
        name: "description",
        content:
          "Acceptance checks for the Til Loan Day runway engine and the Dibs fair-split engine.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SelfTest,
});

interface Suite {
  id: "runway" | "dibs";
  title: string;
  note: string;
  rows: AcceptanceRow[];
}

function passCount(rows: AcceptanceRow[]): number {
  return rows.filter((r) => r.pass).length;
}

/** JSON with a space after commas and colons, so long values wrap at natural points. */
function readable(json: string): string {
  return json.replace(/,(?! )/g, ", ").replace(/":/g, '": ');
}

function TotalPill({
  passed,
  total,
  size,
  testId,
}: {
  passed: number;
  total: number;
  size: "lg" | "sm";
  testId: string;
}) {
  const allPass = passed === total;
  return (
    <p
      className={`inline-flex items-center gap-1.5 rounded-xl font-display font-bold ${
        size === "lg" ? "px-4 py-2 text-2xl" : "px-3 py-1 text-base"
      } ${allPass ? "bg-success-soft text-success-strong" : "bg-warning-soft text-destructive"}`}
    >
      <span aria-hidden="true">{allPass ? "✓" : "✕"}</span>
      <span data-testid={testId}>{`${passed}/${total} ${allPass ? "PASS" : "FAIL"}`}</span>
    </p>
  );
}

function ResultRow({ row }: { row: AcceptanceRow }) {
  return (
    <li
      className={`rounded-2xl border bg-card p-3 sm:p-4 ${
        row.pass ? "border-border" : "border-destructive"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm">
          <span className="mr-2 font-display font-bold">{row.id}</span>
          <span>{row.description}</span>
        </p>
        <span
          className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${
            row.pass ? "bg-success-soft text-success-strong" : "bg-warning-soft text-destructive"
          }`}
        >
          {row.pass ? "PASS" : "FAIL"}
        </span>
      </div>
      <dl className="mt-2 grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="min-w-0">
          <dt className="text-xs font-semibold text-muted-foreground">Expected</dt>
          <dd className="mt-0.5 font-mono text-xs [overflow-wrap:anywhere]">
            {readable(row.expected)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold text-muted-foreground">Actual</dt>
          <dd className="mt-0.5 font-mono text-xs [overflow-wrap:anywhere]">
            {readable(row.actual)}
          </dd>
        </div>
      </dl>
    </li>
  );
}

function SuiteSection({ suite }: { suite: Suite }) {
  const headingId = `selftest-${suite.id}`;
  return (
    <section aria-labelledby={headingId} className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="font-display text-xl font-bold sm:text-2xl">
          {suite.title}
        </h2>
        <TotalPill
          passed={passCount(suite.rows)}
          total={suite.rows.length}
          size="sm"
          testId={`selftest-total-${suite.id}`}
        />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{suite.note}</p>
      <ul className="mt-3 space-y-2" aria-label={`${suite.title} checks`}>
        {suite.rows.map((row) => (
          <ResultRow key={row.id} row={row} />
        ))}
      </ul>
    </section>
  );
}

function SelfTest() {
  const suites = useMemo<Suite[]>(
    () => [
      {
        id: "runway",
        title: "Til Loan Day runway",
        note: "Demo on Fri 20 Nov 2026: £400 balance, £500 overdraft, £6.50 a day, three bills, loan day Mon 18 Jan. Pairs are [before, after] a plan. Money in pence.",
        rows: runRunwayAcceptance(),
      },
      {
        id: "dibs",
        title: "Dibs fair split",
        note: "Expected values were computed independently with exact fractions. Rooms: 0 Box, 1 Middle, 2 Big double. Persons: 0 You, 1 Sam, 2 Alex. Money in pence.",
        rows: runAcceptance(),
      },
    ],
    [],
  );
  const total = suites.reduce((n, s) => n + s.rows.length, 0);
  const passed = suites.reduce((n, s) => n + passCount(s.rows), 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="font-display text-3xl font-bold">Engine selftest</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Both engines run here in your browser on fixed inputs and are checked against values pinned
        by exact reference implementations.
      </p>
      <div className="mt-4">
        <TotalPill passed={passed} total={total} size="lg" testId="selftest-total" />
      </div>
      {suites.map((suite) => (
        <SuiteSection key={suite.id} suite={suite} />
      ))}
    </div>
  );
}
