// Acceptance cases for the fair-split engine. Expected values were computed independently with
// exact fractions. Used by the /selftest page and by the unit tests.

import {
  challenge,
  equalSplitOverLimit,
  pricesByPerson,
  settleUp,
  solveFairSplit,
} from "./fairSplit";
import type { Shortfall, SplitInput, SplitResult } from "./types";

const DEFAULT_PREMIUMS = [
  [0, 5, 25],
  [0, 30, 36],
  [0, 12, 45],
];

function input(limits: (number | null)[], premiums: number[][] = DEFAULT_PREMIUMS): SplitInput {
  return { rentPounds: 330, premiums, limits };
}

type Expectation =
  | {
      feasible: true;
      roomOf: number[];
      pricePence: number[];
      maxGainPence: number;
      binding?: number[];
    }
  | { feasible: false; shortfall: Shortfall };

export interface AcceptanceCase {
  id: string;
  description: string;
  input: SplitInput;
  expected: Expectation;
}

export const ACCEPTANCE_CASES: AcceptanceCase[] = [
  {
    id: "T1",
    description: "Defaults, no limits",
    input: input([null, null, null]),
    expected: {
      feasible: true,
      roomOf: [0, 1, 2],
      pricePence: [9200, 11000, 12800],
      maxGainPence: 0,
      binding: [],
    },
  },
  {
    id: "T2",
    description: "Default demo: You £120, Sam £104",
    input: input([120, 104, null]),
    expected: {
      feasible: true,
      roomOf: [0, 1, 2],
      pricePence: [9500, 10400, 13100],
      maxGainPence: 0,
      binding: [1],
    },
  },
  {
    id: "T3",
    description: "Alex limit £125",
    input: input([null, null, 125]),
    expected: {
      feasible: true,
      roomOf: [0, 1, 2],
      pricePence: [9350, 11150, 12500],
      maxGainPence: 0,
      binding: [2],
    },
  },
  {
    id: "T4",
    description: "Alex limit £122",
    input: input([null, null, 122]),
    expected: {
      feasible: true,
      roomOf: [0, 1, 2],
      pricePence: [9500, 11300, 12200],
      maxGainPence: 0,
      binding: [2],
    },
  },
  {
    id: "T5",
    description: "Alex limit £120: Alex 34p short",
    input: input([null, null, 120]),
    expected: {
      feasible: false,
      shortfall: { kind: "person", person: 2, shortByPence: 34, minLimitPence: 12034 },
    },
  },
  {
    id: "T6",
    description: "Sam limit £100: Sam 67p short",
    input: input([null, 100, null]),
    expected: {
      feasible: false,
      shortfall: { kind: "person", person: 1, shortByPence: 67, minLimitPence: 10067 },
    },
  },
  {
    id: "T7",
    description: "All limits £100: limits add to £300",
    input: input([100, 100, 100]),
    expected: {
      feasible: false,
      shortfall: { kind: "limits-sum", limitsTotalPence: 30000, rentPence: 33000 },
    },
  },
  {
    id: "T8",
    description: "You +40 / +40",
    input: input(
      [null, null, null],
      [
        [0, 40, 40],
        [0, 30, 36],
        [0, 12, 45],
      ],
    ),
    expected: {
      feasible: true,
      roomOf: [1, 0, 2],
      pricePence: [8322, 11856, 12822],
      maxGainPence: 0,
      binding: [],
    },
  },
  {
    id: "T9",
    description: "You −50 / +110 (extreme)",
    input: input(
      [null, null, null],
      [
        [0, -50, 110],
        [0, 30, 36],
        [0, 12, 45],
      ],
    ),
    expected: {
      feasible: true,
      roomOf: [2, 1, 0],
      pricePence: [6467, 9167, 17366],
      maxGainPence: 0,
      binding: [],
    },
  },
  {
    id: "T10",
    description: "Everyone identical (0, 0, +1): 1p rounding",
    input: input(
      [null, null, null],
      [
        [0, 0, 1],
        [0, 0, 1],
        [0, 0, 1],
      ],
    ),
    expected: {
      feasible: true,
      roomOf: [0, 1, 2],
      pricePence: [10967, 10967, 11066],
      maxGainPence: 1,
      binding: [],
    },
  },
];

export interface AcceptanceRow {
  id: string;
  description: string;
  expected: string;
  actual: string;
  pass: boolean;
}

function describeResult(r: SplitResult): string {
  if (!r.feasible) return JSON.stringify({ feasible: false, shortfall: r.shortfall });
  return JSON.stringify({
    roomOf: r.roomOf,
    pricePence: r.pricePence,
    maxGainPence: r.maxSwitchGainPence,
    binding: r.bindingLimits,
    verified: r.verified,
  });
}

function describeExpected(e: Expectation): string {
  if (!e.feasible) return JSON.stringify({ feasible: false, shortfall: e.shortfall });
  return JSON.stringify({
    roomOf: e.roomOf,
    pricePence: e.pricePence,
    maxGainPence: e.maxGainPence,
    binding: e.binding ?? [],
    verified: true,
  });
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function checkCase(c: AcceptanceCase): AcceptanceRow {
  const r = solveFairSplit(c.input);
  const e = c.expected;
  let pass: boolean;
  if (e.feasible) {
    pass =
      r.feasible &&
      r.verified &&
      sameJson(r.roomOf, e.roomOf) &&
      sameJson(r.pricePence, e.pricePence) &&
      r.maxSwitchGainPence === e.maxGainPence &&
      sameJson(r.bindingLimits, e.binding ?? []);
  } else {
    pass = !r.feasible && sameJson(r.shortfall, e.shortfall);
  }
  return {
    id: c.id,
    description: c.description,
    expected: describeExpected(e),
    actual: describeResult(r),
    pass,
  };
}

/** Extra checks on the default demo (T2): challenge sheet, settle-up and the equal-split banner. */
function derivedRows(): AcceptanceRow[] {
  const demo = input([120, 104, null]);
  const r = solveFairSplit(demo);
  const rows: AcceptanceRow[] = [];
  if (!r.feasible) {
    return [
      {
        id: "T2-derived",
        description: "Derived checks",
        expected: "feasible",
        actual: "infeasible",
        pass: false,
      },
    ];
  }
  const toDouble = challenge(demo, r, 0, 2);
  rows.push({
    id: "T2a",
    description: "Challenge You → Big double",
    expected: JSON.stringify({
      costDiffPence: 3600,
      worthDiffPence: 2500,
      betterOffStayingPence: 1100,
      overLimitPence: 1100,
    }),
    actual: JSON.stringify(toDouble),
    pass: sameJson(toDouble, {
      costDiffPence: 3600,
      worthDiffPence: 2500,
      betterOffStayingPence: 1100,
      overLimitPence: 1100,
    }),
  });
  const toMiddle = challenge(demo, r, 0, 1);
  rows.push({
    id: "T2b",
    description: "Challenge You → Middle room",
    expected: JSON.stringify({
      costDiffPence: 900,
      worthDiffPence: 500,
      betterOffStayingPence: 400,
      overLimitPence: 0,
    }),
    actual: JSON.stringify(toMiddle),
    pass: sameJson(toMiddle, {
      costDiffPence: 900,
      worthDiffPence: 500,
      betterOffStayingPence: 400,
      overLimitPence: 0,
    }),
  });
  const transfers = settleUp(pricesByPerson(r), 11000);
  const expectedTransfers = [
    { from: 2, to: 0, amountPence: 1500 },
    { from: 2, to: 1, amountPence: 600 },
  ];
  rows.push({
    id: "T2c",
    description: "Settle-up vs £110 each",
    expected: JSON.stringify(expectedTransfers),
    actual: JSON.stringify(transfers),
    pass: sameJson(transfers, expectedTransfers),
  });
  const over = equalSplitOverLimit(demo);
  rows.push({
    id: "T2d",
    description: "Equal split: Sam £6 over",
    expected: JSON.stringify([{ person: 1, overByPence: 600 }]),
    actual: JSON.stringify(over),
    pass: sameJson(over, [{ person: 1, overByPence: 600 }]),
  });
  return rows;
}

export function runAcceptance(): AcceptanceRow[] {
  return [...ACCEPTANCE_CASES.map(checkCase), ...derivedRows()];
}
