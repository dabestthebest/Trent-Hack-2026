// Shared house bills: who paid what, who owes what, and the transfers that settle it.
// Pure functions over integer pence. People are indices 0..peopleCount-1 (0 is "You").

import type { ISODate } from "@/lib/money/types";

export interface Expense {
  id: string;
  label: string;
  amountPence: number;
  /** Index of the person who paid. */
  paidBy: number;
  /** Indices of the people sharing it, in the order remainder pennies are handed out. */
  splitAmong: number[];
  date: ISODate;
}

export interface Transfer {
  from: number;
  to: number;
  amountPence: number;
}

function checkPerson(i: number, peopleCount: number, what: string): void {
  if (!Number.isInteger(i) || i < 0 || i >= peopleCount) {
    throw new RangeError(`${what} must be a person index from 0 to ${peopleCount - 1}, got ${i}`);
  }
}

/**
 * Equal shares of `amountPence` for each person in `splitAmong` (same order, duplicates removed).
 * Remainder pennies go one each to the earliest people, so the shares always sum to amountPence.
 */
export function splitShares(
  amountPence: number,
  splitAmong: readonly number[],
): { person: number; sharePence: number }[] {
  const people = [...new Set(splitAmong)];
  if (people.length === 0) return [];
  const base = Math.floor(amountPence / people.length);
  const remainder = amountPence - base * people.length;
  return people.map((person, k) => ({ person, sharePence: base + (k < remainder ? 1 : 0) }));
}

/** Net pence per person: + is owed money, − owes money. Always sums to exactly 0. */
export function balances(peopleCount: number, expenses: readonly Expense[]): number[] {
  if (!Number.isInteger(peopleCount) || peopleCount < 0) {
    throw new RangeError(`peopleCount must be a whole number, got ${peopleCount}`);
  }
  const net = Array.from({ length: peopleCount }, () => 0);
  for (const e of expenses) {
    if (!Number.isSafeInteger(e.amountPence) || e.amountPence < 0) {
      throw new RangeError(`"${e.label}" must be a whole, non-negative number of pence`);
    }
    checkPerson(e.paidBy, peopleCount, `"${e.label}" paidBy`);
    for (const p of e.splitAmong) checkPerson(p, peopleCount, `"${e.label}" splitAmong`);
    const shares = splitShares(e.amountPence, e.splitAmong);
    // Nobody to share with: the payer keeps the whole cost, which changes nobody's balance.
    if (shares.length === 0) continue;
    net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amountPence;
    for (const { person, sharePence } of shares) net[person] = (net[person] ?? 0) - sharePence;
  }
  return net;
}

/** Index of the largest value by `score` (ties to the lowest index), or -1 if none is above 0. */
function largest(values: readonly number[], score: (v: number) => number): number {
  let best = -1;
  let bestScore = 0;
  values.forEach((v, i) => {
    const s = score(v);
    if (s > bestScore) {
      best = i;
      bestScore = s;
    }
  });
  return best;
}

/**
 * Greedy settle-up: the largest debtor pays the largest creditor (ties to the lowest index) until
 * everyone is square. Each transfer clears at least one person, so n people need at most n−1.
 */
export function settleTransfers(balancesPence: readonly number[]): Transfer[] {
  const left = [...balancesPence];
  const transfers: Transfer[] = [];
  for (let guard = 0; guard < left.length; guard++) {
    const from = largest(left, (v) => -v);
    const to = largest(left, (v) => v);
    if (from === -1 || to === -1) break;
    const amountPence = Math.min(-(left[from] ?? 0), left[to] ?? 0);
    transfers.push({ from, to, amountPence });
    left[from] = (left[from] ?? 0) + amountPence;
    left[to] = (left[to] ?? 0) - amountPence;
  }
  return transfers;
}

/** Sum of every expense, in pence. */
export function totalPence(expenses: readonly Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountPence, 0);
}
