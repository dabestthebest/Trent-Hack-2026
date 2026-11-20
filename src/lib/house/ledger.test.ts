import { describe, expect, it } from "vitest";

import { balances, settleTransfers, splitShares, totalPence, type Expense } from "./ledger";

let n = 0;
function exp(amountPence: number, paidBy: number, splitAmong: number[]): Expense {
  n += 1;
  return { id: `e${n}`, label: `Thing ${n}`, amountPence, paidBy, splitAmong, date: "2026-11-20" };
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

// The SharedBills demo: You (0), Sam (1), Alex (2).
const DEMO: Expense[] = [
  exp(4260, 1, [0, 1, 2]), // 🛒 Big Tesco shop, Sam paid
  exp(3000, 0, [0, 1, 2]), // 📶 Wi-Fi, You paid
  exp(945, 2, [0, 1, 2]), // 🧻 Loo roll + cleaning stuff, Alex paid
];

describe("splitShares", () => {
  it("splits evenly when it divides", () => {
    expect(splitShares(4260, [0, 1, 2]).map((s) => s.sharePence)).toEqual([1420, 1420, 1420]);
  });

  it("gives remainder pennies to the earliest people in splitAmong order", () => {
    expect(splitShares(1000, [2, 0, 1])).toEqual([
      { person: 2, sharePence: 334 },
      { person: 0, sharePence: 333 },
      { person: 1, sharePence: 333 },
    ]);
    expect(splitShares(1001, [1, 2, 0]).map((s) => s.sharePence)).toEqual([334, 334, 333]);
    expect(sum(splitShares(1, [0, 1, 2]).map((s) => s.sharePence))).toBe(1);
  });

  it("ignores duplicate people and handles an empty split", () => {
    expect(splitShares(10, [1, 1, 0])).toEqual([
      { person: 1, sharePence: 5 },
      { person: 0, sharePence: 5 },
    ]);
    expect(splitShares(10, [])).toEqual([]);
  });
});

describe("balances", () => {
  it("matches the demo house exactly", () => {
    // You: +3000 − 1420 − 1000 − 315 = 265; Sam: +4260 − 1420 − 1000 − 315 = 1525;
    // Alex: +945 − 1420 − 1000 − 315 = −1790.
    const b = balances(3, DEMO);
    expect(b).toEqual([265, 1525, -1790]);
    expect(sum(b)).toBe(0);
    expect(totalPence(DEMO)).toBe(8205);
  });

  it("assigns remainder pennies so each expense nets to exactly zero", () => {
    // £10 split three ways, paid by Alex: You 334, Sam 333, Alex 333.
    expect(balances(3, [exp(1000, 2, [0, 1, 2])])).toEqual([-334, -333, 667]);
    // Same bill, different order: Sam gets the extra penny.
    expect(balances(3, [exp(1000, 2, [1, 0, 2])])).toEqual([-333, -334, 667]);
  });

  it("leaves people outside a split untouched", () => {
    // Sam paid £9 for You and Sam only; Alex is not in it.
    expect(balances(3, [exp(900, 1, [0, 1])])).toEqual([-450, 450, 0]);
    // Paid for someone else entirely.
    expect(balances(3, [exp(500, 0, [2])])).toEqual([500, 0, -500]);
  });

  it("treats a bill only the payer shares (or nobody shares) as no change", () => {
    expect(balances(3, [exp(700, 1, [1]), exp(300, 2, [])])).toEqual([0, 0, 0]);
  });

  it("returns all zeros with no expenses", () => {
    expect(balances(4, [])).toEqual([0, 0, 0, 0]);
  });

  it("rejects bad people and bad money", () => {
    expect(() => balances(3, [exp(100, 3, [0])])).toThrow(RangeError);
    expect(() => balances(3, [exp(100, 0, [0, -1])])).toThrow(RangeError);
    expect(() => balances(3, [exp(1.5, 0, [0, 1])])).toThrow(RangeError);
    expect(() => balances(3, [exp(-100, 0, [0, 1])])).toThrow(RangeError);
  });

  it("always sums to zero over many random houses", () => {
    let seed = 7;
    const rand = (k: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % k;
    };
    for (let t = 0; t < 300; t++) {
      const people = 2 + rand(5);
      const list: Expense[] = [];
      for (let e = 0; e < rand(8); e++) {
        const split = Array.from({ length: people }, (_, i) => i).filter(() => rand(3) > 0);
        list.push(exp(rand(20000), rand(people), split));
      }
      const b = balances(people, list);
      expect(sum(b)).toBe(0);
      const transfers = settleTransfers(b);
      expect(transfers.length).toBeLessThanOrEqual(people - 1);
      const after = [...b];
      for (const tr of transfers) {
        expect(tr.amountPence).toBeGreaterThan(0);
        after[tr.from] = (after[tr.from] ?? 0) + tr.amountPence;
        after[tr.to] = (after[tr.to] ?? 0) - tr.amountPence;
      }
      expect(after.every((v) => v === 0)).toBe(true);
    }
  });
});

describe("settleTransfers", () => {
  it("settles the demo house in two transfers", () => {
    expect(settleTransfers([265, 1525, -1790])).toEqual([
      { from: 2, to: 1, amountPence: 1525 },
      { from: 2, to: 0, amountPence: 265 },
    ]);
  });

  it("has the largest debtor pay the largest creditor first", () => {
    expect(settleTransfers([-500, -1000, 300, 1200])).toEqual([
      { from: 1, to: 3, amountPence: 1000 },
      { from: 0, to: 2, amountPence: 300 },
      { from: 0, to: 3, amountPence: 200 },
    ]);
  });

  it("breaks ties by the lowest index", () => {
    expect(settleTransfers([-300, 300, -300, 300])).toEqual([
      { from: 0, to: 1, amountPence: 300 },
      { from: 2, to: 3, amountPence: 300 },
    ]);
  });

  it("needs no transfers when everyone is square", () => {
    expect(settleTransfers([0, 0, 0])).toEqual([]);
    expect(settleTransfers([])).toEqual([]);
  });

  it("does not change its input", () => {
    const input = [265, 1525, -1790];
    settleTransfers(input);
    expect(input).toEqual([265, 1525, -1790]);
  });
});
