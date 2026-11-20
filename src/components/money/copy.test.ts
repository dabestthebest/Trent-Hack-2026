import { describe, expect, it } from "vitest";

import { computeRunway, previewPlan } from "@/lib/money/runway";
import type { Plan, PlanPreview, RunwayInput, RunwayOk } from "@/lib/money/types";

import {
  billsAloneLine,
  cellLabel,
  chipText,
  countsLine,
  daysToLoanPill,
  paceLine,
  poundsShort,
  previewRows,
  safeUntilLine,
  verdictHeadline,
} from "./copy";

// The spec's acceptance fixture (today Fri 20 Nov 2026).
const TODAY = "2026-11-20";
const BASE: RunwayInput = {
  today: TODAY,
  loanDate: "2027-01-18",
  balancePence: 40000,
  overdraftPence: 50000,
  dailySpendPence: 650,
  bills: [
    { id: "a", label: "Phone", amountPence: 1500, date: "2026-12-05" },
    { id: "b", label: "Train home", amountPence: 3800, date: "2026-12-17" },
    { id: "c", label: "Phone", amountPence: 1500, date: "2027-01-05" },
  ],
};

function runway(patch: Partial<RunwayInput> = {}): RunwayOk {
  const r = computeRunway({ ...BASE, ...patch });
  if (!r.ok) throw new Error(r.message);
  return r;
}

function preview(plan: Plan, patch: Partial<RunwayInput> = {}): PlanPreview {
  const p = previewPlan({ ...BASE, ...patch }, plan);
  if (p === null) throw new Error("no preview");
  return p;
}

const WINTER_BALL: Plan = { label: "Winter ball", amountPence: 5500, date: "2026-12-04" };

describe("hero copy (R1)", () => {
  const r = runway();
  it("shows the safe line, pill and overdraft pace line", () => {
    expect(safeUntilLine(BASE.loanDate)).toBe("safe to spend until Mon 18 Jan");
    expect(daysToLoanPill(r.days)).toBe("59 days to loan day");
    expect(daysToLoanPill(1)).toBe("1 day to loan day");
    expect(paceLine(r, 650, 50000)).toEqual({
      tone: "overdraft",
      text: "At your usual £6.50 a day, you'd dip into your overdraft on Sun 10 Jan, 8 days before loan day.",
    });
  });

  it("R6: £5.62 a day reaches loan day with money to spare", () => {
    const r6 = runway({ dailySpendPence: 562 });
    expect(paceLine(r6, 562, 50000)).toEqual({
      tone: "own",
      text: "At your usual £5.62 a day, you'll reach loan day with £0.42 to spare.",
    });
  });

  it("R7: one penny more dips in 1 day before loan day", () => {
    const r7 = runway({ dailySpendPence: 563 });
    expect(paceLine(r7, 563, 50000).text).toBe(
      "At your usual £5.63 a day, you'd dip into your overdraft on Sun 17 Jan, 1 day before loan day.",
    );
  });

  it("exhausted runway names the day the overdraft runs out", () => {
    const r4 = preview({ label: "Ski trip deposit", amountPence: 45000, date: "2026-12-12" }).after;
    expect(paceLine(r4, 650, 50000)).toEqual({
      tone: "exhausted",
      text: "At your usual £6.50 a day, your £500 overdraft runs out on Sun 17 Jan.",
    });
  });

  it("R8: bills alone warning", () => {
    const r8 = runway({ balancePence: 5000, dailySpendPence: 0 });
    expect(r8.billsAloneOverdraftDate).toBe("2026-12-17");
    expect(billsAloneLine(r8.billsAloneOverdraftDate ?? "")).toBe(
      "Your bills alone take you below £0 on Thu 17 Dec.",
    );
  });
});

describe("preview copy", () => {
  it("R2 winter ball: 7 days sooner with the spec's rows", () => {
    const p = preview(WINTER_BALL);
    expect(verdictHeadline(p, TODAY, 50000)).toBe("You'd hit your overdraft 7 days sooner.");
    const rows = previewRows(p, 50000);
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ["Safe to spend", "£5.62 → £4.69 a day"],
      ["Overdraft from", "Sun 10 Jan → Sun 3 Jan"],
      ["Day before loan day", "−£51.50 → −£106.50"],
    ]);
    expect(rows[2]?.hint).toBe("of your £500 overdraft");
    expect(rows[0]?.change).toBe("−£0.93 a day");
    expect(rows[1]?.change).toBe("7 days sooner");
  });

  it("R3 Christmas meal: 5 days sooner", () => {
    const p = preview({ label: "Christmas meal", amountPence: 2800, date: "2026-12-10" });
    expect(verdictHeadline(p, TODAY, 50000)).toBe("You'd hit your overdraft 5 days sooner.");
  });

  it("R4 ski trip: uses up the whole overdraft", () => {
    const p = preview({ label: "Ski trip deposit", amountPence: 45000, date: "2026-12-12" });
    expect(verdictHeadline(p, TODAY, 50000)).toBe("This would use up your whole overdraft.");
    expect(previewRows(p, 50000)[2]?.hint).toBe("more than your £500 overdraft");
  });

  it("R5 gig after loan day: outside the window", () => {
    const p = preview({ label: "Gig", amountPence: 3000, date: "2027-01-20" });
    expect(verdictHeadline(p, TODAY, 50000)).toBe(
      "That's after loan day, so it doesn't change this runway.",
    );
    expect(previewRows(p, 50000).map((r) => r.change)).toEqual([
      "No change",
      "No change",
      "No change",
    ]);
  });

  it("R10 fine, R11 causes overdraft", () => {
    const fine = preview(WINTER_BALL, { dailySpendPence: 400 });
    expect(verdictHeadline(fine, TODAY, 50000)).toBe("Yes, you can afford it.");
    expect(previewRows(fine, 50000)[1]?.value).toBe("Never → Never");
    expect(previewRows(fine, 50000)[2]?.hint).toBe("to spare");

    const pushes = preview(WINTER_BALL, { dailySpendPence: 500 });
    expect(verdictHeadline(pushes, TODAY, 50000)).toBe("It would push you into your overdraft.");
    expect(previewRows(pushes, 50000)[1]).toMatchObject({
      value: "Never → Thu 14 Jan",
      change: "New with this plan",
    });
  });

  it("singular day and 'further into' variants", () => {
    const p = preview(WINTER_BALL);
    expect(verdictHeadline({ ...p, daysEarlierOverdraft: 1 }, TODAY, 50000)).toBe(
      "You'd hit your overdraft 1 day sooner.",
    );
    expect(verdictHeadline({ ...p, daysEarlierOverdraft: 0 }, TODAY, 50000)).toBe(
      "You'd go further into your overdraft.",
    );
  });
});

describe("chips, cells and counts", () => {
  it("chip text matches the spec", () => {
    expect(chipText({ ...WINTER_BALL, emoji: "💃" })).toBe("💃 Winter ball · £55 · Fri 4 Dec");
    expect(chipText({ label: "Gig", amountPence: 1050, date: "2027-01-20" })).toBe(
      "Gig · £10.50 · Wed 20 Jan",
    );
  });

  it("cell aria-labels start with the spec's shape", () => {
    const r = runway();
    const jan10 = r.timeline.find((c) => c.date === "2027-01-10");
    expect(jan10 && cellLabel(jan10)).toBe("Sun 10 Jan: −£6.00, in your overdraft");
    const dec5 = r.timeline.find((c) => c.date === "2026-12-05");
    expect(dec5 && cellLabel(dec5, { isToday: false, changed: true })).toBe(
      "Sat 5 Dec: £281.00, your own money. Phone due (£15.00). Changed by this plan",
    );
  });

  it("counts line, with and without a plan", () => {
    expect(countsLine({ own: 51, overdraft: 8, exhausted: 0 }, null)).toBe(
      "51 days on your own money · 8 in your overdraft",
    );
    expect(
      countsLine({ own: 44, overdraft: 15, exhausted: 0 }, { own: 51, overdraft: 8, exhausted: 0 }),
    ).toBe("44 days on your own money (was 51) · 15 in your overdraft (was 8)");
    expect(countsLine({ own: 59, overdraft: 0, exhausted: 0 }, null)).toBe(
      "59 days on your own money",
    );
  });

  it("poundsShort drops .00 only", () => {
    expect(poundsShort(50000)).toBe("£500");
    expect(poundsShort(5550)).toBe("£55.50");
    expect(poundsShort(-5000)).toBe("−£50");
  });
});
