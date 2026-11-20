import { describe, expect, it } from "vitest";

import {
  expandAll,
  expandRecurring,
  monthlyEquivalentPence,
  type Frequency,
  type RecurringItem,
} from "./recurring";

function item(frequency: Frequency, firstDate: string, patch: Partial<RecurringItem> = {}) {
  return { id: "x", label: "Shift", amountPence: 6000, firstDate, frequency, ...patch };
}

const dates = (i: RecurringItem, from: string, to: string) =>
  expandRecurring(i, from, to).map((o) => o.date);

describe("expandRecurring", () => {
  it("once: inside the range only, with from inclusive and to exclusive", () => {
    expect(dates(item("once", "2026-12-01"), "2026-11-20", "2027-01-11")).toEqual(["2026-12-01"]);
    expect(dates(item("once", "2026-11-20"), "2026-11-20", "2027-01-11")).toEqual(["2026-11-20"]);
    expect(dates(item("once", "2027-01-11"), "2026-11-20", "2027-01-11")).toEqual([]);
    expect(dates(item("once", "2026-11-19"), "2026-11-20", "2027-01-11")).toEqual([]);
  });

  it("weekly: every Saturday before loan day (the R12 dates)", () => {
    expect(dates(item("weekly", "2026-11-21"), "2026-11-20", "2027-01-11")).toEqual([
      "2026-11-21",
      "2026-11-28",
      "2026-12-05",
      "2026-12-12",
      "2026-12-19",
      "2026-12-26",
      "2027-01-02",
      "2027-01-09",
    ]);
  });

  it("weekly and fortnightly skip occurrences before from, keeping the same weekday", () => {
    expect(dates(item("weekly", "2026-10-31"), "2026-11-20", "2026-12-06")).toEqual([
      "2026-11-21",
      "2026-11-28",
      "2026-12-05",
    ]);
    expect(dates(item("fortnightly", "2026-11-06"), "2026-11-20", "2027-01-01")).toEqual([
      "2026-11-20",
      "2026-12-04",
      "2026-12-18",
    ]);
  });

  it("monthly clamps to the month's last day but keeps the original day afterwards", () => {
    expect(dates(item("monthly", "2027-01-31"), "2027-01-01", "2027-06-01")).toEqual([
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
      "2027-04-30",
      "2027-05-31",
    ]);
  });

  it("monthly on the 31st hits 29 Feb in a leap year", () => {
    expect(dates(item("monthly", "2027-12-31"), "2028-01-15", "2028-04-01")).toEqual([
      "2028-01-31",
      "2028-02-29",
      "2028-03-31",
    ]);
    expect(dates(item("monthly", "2028-02-29"), "2028-02-01", "2028-05-01")).toEqual([
      "2028-02-29",
      "2028-03-29",
      "2028-04-29",
    ]);
  });

  it("monthly rolls over the year end and skips months before from", () => {
    expect(dates(item("monthly", "2026-10-05"), "2026-11-20", "2027-02-10")).toEqual([
      "2026-12-05",
      "2027-01-05",
      "2027-02-05",
    ]);
  });

  it("gives ids of the form id@date and copies label and amount", () => {
    const out = expandRecurring(
      item("monthly", "2026-12-12", { id: "sub-1", label: "Music streaming", amountPence: 1099 }),
      "2026-11-20",
      "2027-01-11",
    );
    expect(out).toEqual([
      { id: "sub-1@2026-12-12", label: "Music streaming", amountPence: 1099, date: "2026-12-12" },
    ]);
  });

  it("returns nothing for an empty or backwards range, or an invalid date", () => {
    expect(dates(item("weekly", "2026-11-21"), "2026-11-20", "2026-11-20")).toEqual([]);
    expect(dates(item("weekly", "2026-11-21"), "2027-01-11", "2026-11-20")).toEqual([]);
    expect(dates(item("weekly", "2026-02-30"), "2026-01-01", "2026-12-31")).toEqual([]);
    expect(dates(item("monthly", "2026-12-01"), "nope", "2026-12-31")).toEqual([]);
  });
});

describe("expandAll and monthlyEquivalentPence", () => {
  it("merges items in date order", () => {
    const out = expandAll(
      [item("once", "2026-12-10", { id: "a" }), item("weekly", "2026-12-01", { id: "b" })],
      "2026-12-01",
      "2026-12-16",
    );
    expect(out.map((o) => o.id)).toEqual([
      "b@2026-12-01",
      "b@2026-12-08",
      "a@2026-12-10",
      "b@2026-12-15",
    ]);
  });

  it("converts to a monthly figure", () => {
    expect(monthlyEquivalentPence({ amountPence: 999, frequency: "monthly" })).toBe(999);
    expect(monthlyEquivalentPence({ amountPence: 1200, frequency: "weekly" })).toBe(5200);
    expect(monthlyEquivalentPence({ amountPence: 1200, frequency: "fortnightly" })).toBe(2600);
    expect(monthlyEquivalentPence({ amountPence: 1200, frequency: "once" })).toBe(0);
  });
});
