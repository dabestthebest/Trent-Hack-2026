import { describe, expect, it } from "vitest";

import { parseDate, parseLabel, parsePounds, penceToInput } from "./parse";

const money = (s: string) => parsePounds(s, { allowZero: true });

describe("parsePounds", () => {
  it.each([
    ["6.50", 650],
    ["6.5", 650],
    ["6.", 600],
    [".5", 50],
    ["0.07", 7],
    ["400", 40000],
    ["£400", 40000],
    ["£ 1,234.56", 123456],
    ["  12.34  ", 1234],
    ["0", 0],
    ["0.10", 10],
    ["1,000,000", 100000000],
  ])("parses %j as %i pence", (input, pence) => {
    expect(money(input)).toEqual({ ok: true, value: pence });
  });

  it("never goes through floating point (0.29 is 29p, not 28)", () => {
    expect(money("0.29")).toEqual({ ok: true, value: 29 });
    expect(money("1.15")).toEqual({ ok: true, value: 115 });
    expect(money("4.35")).toEqual({ ok: true, value: 435 });
  });

  it.each([
    ["", "Enter an amount."],
    ["   ", "Enter an amount."],
    ["-5", "Enter £0 or more."],
    ["−5", "Enter £0 or more."],
    ["6.505", "Use at most 2 decimal places."],
    ["6,50", "Use a dot for pence, like 6.50."],
    ["1,2345", "Use a dot for pence, like 6.50."],
    ["abc", "Use numbers only, like 6.50."],
    ["1e3", "Use numbers only, like 6.50."],
    [".", "Use numbers only, like 6.50."],
    ["6.5.0", "Use numbers only, like 6.50."],
    ["1000001", "Enter up to £1,000,000."],
  ])("rejects %j", (input, error) => {
    expect(money(input)).toEqual({ ok: false, error });
  });

  it("can require more than £0", () => {
    expect(parsePounds("0", { allowZero: false })).toEqual({
      ok: false,
      error: "Enter an amount above £0.",
    });
    expect(parsePounds("0.01", { allowZero: false })).toEqual({ ok: true, value: 1 });
  });

  it("uses the field's own empty message", () => {
    expect(parsePounds("", { allowZero: true, emptyMessage: "Enter your balance." })).toEqual({
      ok: false,
      error: "Enter your balance.",
    });
  });
});

describe("penceToInput", () => {
  it("formats integer pence for an input", () => {
    expect(penceToInput(40000)).toBe("400.00");
    expect(penceToInput(650)).toBe("6.50");
    expect(penceToInput(7)).toBe("0.07");
    expect(penceToInput(0)).toBe("0.00");
  });

  it("round-trips through parsePounds", () => {
    for (const p of [0, 1, 9, 10, 99, 100, 101, 650, 40000, 123456]) {
      expect(money(penceToInput(p))).toEqual({ ok: true, value: p });
    }
  });
});

describe("parseLabel", () => {
  it("trims and collapses spaces", () => {
    expect(parseLabel("  Gig   tickets ")).toEqual({ ok: true, value: "Gig tickets" });
  });
  it("needs some text, and not too much", () => {
    expect(parseLabel("   ").ok).toBe(false);
    expect(parseLabel("x".repeat(41)).ok).toBe(false);
    expect(parseLabel("x".repeat(40)).ok).toBe(true);
  });
});

describe("parseDate", () => {
  it("accepts real ISO dates and enforces the minimum", () => {
    expect(parseDate("2026-12-04")).toEqual({ ok: true, value: "2026-12-04" });
    expect(parseDate("2026-02-30").ok).toBe(false);
    expect(parseDate("").ok).toBe(false);
    expect(parseDate("2026-11-19", { min: "2026-11-20", minMessage: "Too early" })).toEqual({
      ok: false,
      error: "Too early",
    });
    expect(parseDate("2026-11-20", { min: "2026-11-20" }).ok).toBe(true);
  });
});
