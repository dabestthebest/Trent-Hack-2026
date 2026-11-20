import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { runAcceptance } from "@/lib/dibs/acceptance";

export const Route = createFileRoute("/selftest")({
  head: () => ({
    meta: [
      { title: "Dibs selftest" },
      { name: "description", content: "Acceptance checks for the Dibs fair-split engine." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SelfTest,
});

function SelfTest() {
  const rows = useMemo(() => runAcceptance(), []);
  const passed = rows.filter((r) => r.pass).length;
  const allPass = passed === rows.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/" className="text-sm text-muted-foreground underline underline-offset-2">
          ← Back to Dibs
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold">Engine selftest</h1>
        <p
          data-testid="selftest-total"
          className={`mt-3 inline-block rounded-xl px-4 py-2 font-display text-2xl font-bold ${
            allPass ? "bg-success-soft text-success-strong" : "bg-warning-soft text-destructive"
          }`}
        >
          {passed}/{rows.length} {allPass ? "PASS" : "FAIL"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Expected values were computed independently with exact fractions. Rooms: 0 Box, 1 Middle,
          2 Big double. Persons: 0 You, 1 Sam, 2 Alex. Money in pence.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="p-2 font-semibold">#</th>
                <th className="p-2 font-semibold">Case</th>
                <th className="p-2 font-semibold">Expected</th>
                <th className="p-2 font-semibold">Actual</th>
                <th className="p-2 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="p-2 font-medium">{r.id}</td>
                  <td className="p-2">{r.description}</td>
                  <td className="p-2 font-mono text-xs break-all">{r.expected}</td>
                  <td className="p-2 font-mono text-xs break-all">{r.actual}</td>
                  <td className={`p-2 font-bold ${r.pass ? "text-success" : "text-destructive"}`}>
                    {r.pass ? "PASS" : "FAIL"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
