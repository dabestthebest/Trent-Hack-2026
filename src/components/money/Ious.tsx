import { Check, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { pounds } from "@/lib/dibs/format";
import { addDays } from "@/lib/money/dates";
import {
  describeIou,
  iouTotals,
  owedMessage,
  reminderText,
  type Iou,
  type IouDirection,
  type IouKind,
} from "@/lib/money/ious";
import { useMoney } from "@/lib/money/store";
import { cn } from "@/lib/utils";

let iouCounter = 0;
const newId = () => `iou-${++iouCounter}`;

const DEMO_IOUS: Iou[] = [
  {
    id: "iou-demo-1",
    direction: "owed",
    who: "Sam",
    kind: "money",
    amountPence: 80,
    what: "crisps",
    settled: false,
  },
  {
    id: "iou-demo-2",
    direction: "owe",
    who: "Alex",
    kind: "favour",
    amountPence: 0,
    what: "a lift to the station",
    settled: false,
  },
];

function toPence(raw: string): number | null {
  const s = raw.replace(/[£,\s]/g, "");
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  const p = Number(w) * 100 + Number(f.padEnd(2, "0"));
  return p > 0 ? p : null;
}

const SEG =
  "flex-1 min-h-11 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Small IOUs: crisps money, a borrowed tenner, a lift you owe someone. */
export function Ious() {
  const { today, addBill } = useMoney();
  const id = useId();
  const [ious, setIous] = useState<Iou[]>(DEMO_IOUS);
  const [direction, setDirection] = useState<IouDirection>("owed");
  const [kind, setKind] = useState<IouKind>("money");
  const [who, setWho] = useState("");
  const [amount, setAmount] = useState("");
  const [what, setWhat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const totals = iouTotals(ious);
  const open = ious.filter((i) => !i.settled);

  const add = () => {
    setNotice(null);
    if (who.trim() === "") return setError("Who is it with?");
    let amountPence = 0;
    if (kind === "money") {
      const p = toPence(amount);
      if (p === null) return setError("Enter an amount, like 0.80 or 10.");
      amountPence = p;
    } else if (what.trim() === "") {
      return setError("What's the favour? For example: a lift, a charger, cooking dinner.");
    }
    setError(null);
    setIous((xs) => [
      {
        id: newId(),
        direction,
        who: who.trim().slice(0, 20),
        kind,
        amountPence,
        what: what.trim().slice(0, 40),
        settled: false,
      },
      ...xs,
    ]);
    setWho("");
    setAmount("");
    setWhat("");
  };

  const settle = (iouId: string) =>
    setIous((xs) => xs.map((x) => (x.id === iouId ? { ...x, settled: true } : x)));

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div>
        <h2 id={`${id}-heading`} className="font-display text-xl font-semibold">
          🤝 Small IOUs
        </h2>
        <p className="text-sm text-muted-foreground">
          &ldquo;Bro, can I borrow 80p for crisps?&rdquo; Keep track of the little loans and favours
          so nobody&apos;s out of pocket.
        </p>
      </div>

      <p className="rounded-xl bg-secondary/60 px-3 py-2 text-sm font-medium tabular-nums">
        You&apos;re owed {pounds(totals.owedToMePence)}
        {totals.favoursOwedToMe > 0
          ? ` + ${totals.favoursOwedToMe} favour${totals.favoursOwedToMe === 1 ? "" : "s"}`
          : ""}
        {" · "}You owe {pounds(totals.iOwePence)}
        {totals.favoursIOwe > 0
          ? ` + ${totals.favoursIOwe} favour${totals.favoursIOwe === 1 ? "" : "s"}`
          : ""}
      </p>

      {open.length > 0 ? (
        <ul className="space-y-2" aria-label="Open IOUs">
          {open.map((i) => {
            const message = i.direction === "owed" ? reminderText(i) : owedMessage(i);
            return (
              <li key={i.id} className="rounded-xl border border-border bg-background/60 p-3">
                <p className="font-medium">{describeIou(i)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => settle(i.id)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" /> Settled
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {i.direction === "owed" ? "Friendly nudge" : "Message them"}
                  </a>
                  {i.direction === "owe" && i.kind === "money" && today ? (
                    <button
                      type="button"
                      onClick={() => {
                        addBill({
                          label: `Pay back ${i.who}`,
                          amountPence: i.amountPence,
                          date: addDays(today, 3),
                        });
                        setNotice(
                          `✓ Added paying back ${i.who} (${pounds(i.amountPence)}) to your runway.`,
                        );
                      }}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add to my runway
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Delete: ${describeIou(i)}`}
                    onClick={() => setIous((xs) => xs.filter((x) => x.id !== i.id))}
                    className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">All square. Nice.</p>
      )}

      <div aria-live="polite">
        {notice ? <p className="text-sm font-medium text-success-strong">{notice}</p> : null}
      </div>

      <fieldset className="space-y-2 rounded-xl border border-dashed border-border p-3">
        <legend className="px-1 text-sm font-semibold">Add one</legend>
        <div
          role="radiogroup"
          aria-label="Who owes who"
          className="flex gap-1 rounded-xl bg-secondary/60 p-1"
        >
          {(["owed", "owe"] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => setDirection(d)}
              className={cn(SEG, direction === d ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {d === "owed" ? "They owe me" : "I owe them"}
            </button>
          ))}
        </div>
        <div
          role="radiogroup"
          aria-label="Money or favour"
          className="flex gap-1 rounded-xl bg-secondary/60 p-1"
        >
          {(["money", "favour"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(SEG, kind === k ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {k === "money" ? "💷 Money" : "🙏 Favour"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            <span>Who</span>
            <input
              value={who}
              maxLength={20}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Sam"
              className="h-11 w-full rounded-lg border border-border bg-card px-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {kind === "money" ? (
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>£ how much</span>
              <input
                value={amount}
                inputMode="decimal"
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.80"
                className="h-11 w-full rounded-lg border border-border bg-card px-2 text-base tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          ) : null}
          <label
            className={cn(
              "space-y-1 text-xs font-medium text-muted-foreground",
              kind === "favour" && "col-span-1",
            )}
          >
            <span>{kind === "money" ? "What for (optional)" : "What's the favour"}</span>
            <input
              value={what}
              maxLength={40}
              onChange={(e) => setWhat(e.target.value)}
              placeholder={kind === "money" ? "crisps" : "a lift"}
              className="h-11 w-full rounded-lg border border-border bg-card px-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={add}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add IOU
        </button>
      </fieldset>

      <p className="text-xs text-muted-foreground">
        Money people owe you isn&apos;t counted in your runway, in case it doesn&apos;t come back.
        Nothing is saved or sent unless you tap a message button.
      </p>
    </section>
  );
}
