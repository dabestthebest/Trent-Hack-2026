// Dibs fair-split engine. Pure functions, no UI.
//
// Model: 3 housemates, 3 rooms, quasi-linear utilities. Each person states, per room, how much
// more per week they would pay than for the Box room. We find a room assignment and weekly rents
// that (a) sum to the total rent, (b) leave nobody preferring another room at its price,
// (c) respect each person's weekly limit, and (d) among those, make the least happy person as
// happy as possible (maximin). See "Fair Rent Division on a Budget", Procaccia, Velez & Yu, AAAI 2018.
//
// With 3 rooms the prices have two degrees of freedom once they must sum to the rent, so we work in
// x = pMiddle - pBox and y = pDouble - pBox, where every constraint is a half-plane. The maximin
// optimum lies on an intersection of two constraint or equal-utility lines, so we enumerate them.

import type {
  ChallengeResult,
  FeasibleSplit,
  OverLimit,
  Shortfall,
  SplitInput,
  SplitResult,
  Transfer,
} from "./types";

const ROOM_COUNT = 3;
const EPS = 1e-7;

/** Python itertools.permutations(range(3)) order; sigma[person] = room. */
const PERMUTATIONS: readonly (readonly number[])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/** a*x + b*y <= c for constraints, a*x + b*y = c for lines. */
interface HalfPlane {
  a: number;
  b: number;
  c: number;
}

/** A linear form ax*x + ay*y + k. */
interface Form {
  ax: number;
  ay: number;
  k: number;
}

function get<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`index ${i} out of range`);
  return v;
}

function priceForm(room: number, rent: number): Form {
  const k = rent / 3;
  if (room === 0) return { ax: -1 / 3, ay: -1 / 3, k };
  if (room === 1) return { ax: 2 / 3, ay: -1 / 3, k };
  return { ax: -1 / 3, ay: 2 / 3, k };
}

function evalForm(f: Form, x: number, y: number): number {
  return f.ax * x + f.ay * y + f.k;
}

function pricesAt(x: number, y: number, rent: number): number[] {
  const pBox = (rent - x - y) / 3;
  return [pBox, pBox + x, pBox + y];
}

function premium(input: SplitInput, person: number, room: number): number {
  return get(get(input.premiums, person), room);
}

function welfare(input: SplitInput, sigma: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < ROOM_COUNT; i++) total += premium(input, i, get(sigma, i));
  return total;
}

interface ExactSolution {
  sigma: readonly number[];
  prices: number[];
}

/** Core solver on pounds (floats). Returns null when no split meets every constraint. */
function solveExact(input: SplitInput, limits: readonly (number | null)[]): ExactSolution | null {
  const rent = input.rentPounds;
  const value = (person: number, room: number): number => {
    const row = get(input.premiums, person);
    const sum = row.reduce((s, q) => s + q, 0);
    return (rent - sum) / 3 + get(row, room);
  };

  const maxWelfare = Math.max(...PERMUTATIONS.map((s) => welfare(input, s)));
  const tied = PERMUTATIONS.filter((s) => welfare(input, s) === maxWelfare);

  let best: { minUtil: number; dev: number; sigma: readonly number[]; prices: number[] } | null =
    null;

  for (const sigma of tied) {
    const constraints: HalfPlane[] = [];
    // No envy: p[own] - p[r] <= q[own] - q[r] for every other room r.
    for (let i = 0; i < ROOM_COUNT; i++) {
      const own = get(sigma, i);
      const fo = priceForm(own, rent);
      for (let r = 0; r < ROOM_COUNT; r++) {
        if (r === own) continue;
        const fr = priceForm(r, rent);
        constraints.push({
          a: fo.ax - fr.ax,
          b: fo.ay - fr.ay,
          c: value(i, own) - value(i, r) - (fo.k - fr.k),
        });
      }
    }
    // Non-negative prices: -p[r] <= 0.
    for (let r = 0; r < ROOM_COUNT; r++) {
      const f = priceForm(r, rent);
      constraints.push({ a: -f.ax, b: -f.ay, c: f.k });
    }
    // Limits: p[own] <= limit.
    for (let i = 0; i < ROOM_COUNT; i++) {
      const limit = limits[i];
      if (limit === null || limit === undefined) continue;
      const f = priceForm(get(sigma, i), rent);
      constraints.push({ a: f.ax, b: f.ay, c: limit - f.k });
    }

    // Utility u[i] = value(i, own) - p[own], as a linear form in (x, y).
    const util: Form[] = [];
    for (let i = 0; i < ROOM_COUNT; i++) {
      const own = get(sigma, i);
      const f = priceForm(own, rent);
      util.push({ ax: -f.ax, ay: -f.ay, k: value(i, own) - f.k });
    }

    const lines: HalfPlane[] = [...constraints];
    for (let i = 0; i < ROOM_COUNT; i++) {
      for (let j = i + 1; j < ROOM_COUNT; j++) {
        const ui = get(util, i);
        const uj = get(util, j);
        lines.push({ a: ui.ax - uj.ax, b: ui.ay - uj.ay, c: uj.k - ui.k });
      }
    }

    for (let m = 0; m < lines.length; m++) {
      for (let n = m + 1; n < lines.length; n++) {
        const l1 = get(lines, m);
        const l2 = get(lines, n);
        const det = l1.a * l2.b - l2.a * l1.b;
        if (Math.abs(det) < 1e-12) continue;
        const x = (l1.c * l2.b - l2.c * l1.b) / det;
        const y = (l1.a * l2.c - l2.a * l1.c) / det;
        if (!constraints.every((h) => h.a * x + h.b * y <= h.c + EPS)) continue;

        const minUtil = Math.min(...util.map((u) => evalForm(u, x, y)));
        const prices = pricesAt(x, y, rent);
        const dev = prices.reduce((s, p) => s + (p - rent / 3) ** 2, 0);
        const better =
          best === null ||
          minUtil > best.minUtil + EPS ||
          (Math.abs(minUtil - best.minUtil) <= EPS && dev < best.dev - EPS);
        if (better) best = { minUtil, dev, sigma, prices };
      }
    }
  }

  return best === null ? null : { sigma: best.sigma, prices: best.prices };
}

/** Round pounds to pence so the total is exactly rentPence (largest remainder, ties by room order). */
function roundToPence(prices: readonly number[], rentPence: number): number[] {
  const pence = prices.map((p) => {
    const v = p * 100;
    const near = Math.round(v);
    return Math.abs(v - near) < 1e-6 ? near : v;
  });
  const floors = pence.map((v) => Math.floor(v));
  let remaining = rentPence - floors.reduce((s, v) => s + v, 0);
  const order = [0, 1, 2].sort((r1, r2) => {
    const f1 = get(pence, r1) - get(floors, r1);
    const f2 = get(pence, r2) - get(floors, r2);
    if (Math.abs(f1 - f2) > 1e-9) return f2 - f1;
    return r1 - r2;
  });
  const out = [...floors];
  for (const r of order) {
    if (remaining <= 0) break;
    out[r] = get(out, r) + 1;
    remaining--;
  }
  return out;
}

function verify(
  input: SplitInput,
  roomOf: readonly number[],
  pricePence: readonly number[],
): { ok: boolean; maxGain: number } {
  const rentPence = input.rentPounds * 100;
  let ok = pricePence.reduce((s, p) => s + p, 0) === rentPence;
  if (pricePence.some((p) => p < 0 || !Number.isInteger(p))) ok = false;

  let maxGain = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < ROOM_COUNT; i++) {
    const own = get(roomOf, i);
    const limit = input.limits[i];
    if (limit !== null && limit !== undefined && get(pricePence, own) > limit * 100) ok = false;
    for (let r = 0; r < ROOM_COUNT; r++) {
      const gain =
        premium(input, i, r) * 100 -
        get(pricePence, r) -
        (premium(input, i, own) * 100 - get(pricePence, own));
      maxGain = Math.max(maxGain, gain);
    }
  }
  if (maxGain > 1) ok = false;

  const best = Math.max(...PERMUTATIONS.map((s) => welfare(input, s)));
  if (welfare(input, roomOf) !== best) ok = false;
  if (new Set(roomOf).size !== ROOM_COUNT) ok = false;

  return { ok, maxGain: Math.max(0, maxGain) };
}

function findShortfall(input: SplitInput): Shortfall {
  const rent = input.rentPounds;
  const limits = input.limits;
  const allSet = limits.every((l) => l !== null);
  if (allSet) {
    const total = limits.reduce<number>((s, l) => s + (l ?? 0), 0);
    if (total < rent) {
      return { kind: "limits-sum", limitsTotalPence: total * 100, rentPence: rent * 100 };
    }
  }

  let best: { person: number; shortBy: number; min: number } | null = null;
  for (let i = 0; i < ROOM_COUNT; i++) {
    const limit = limits[i];
    if (limit === null || limit === undefined) continue;
    const feasibleAt = (pence: number): boolean => {
      const trial = [...limits];
      trial[i] = pence / 100;
      return solveExact(input, trial) !== null;
    };
    if (!feasibleAt(rent * 100)) continue;
    let lo = limit * 100;
    let hi = rent * 100;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (feasibleAt(mid)) hi = mid;
      else lo = mid + 1;
    }
    const shortBy = lo - limit * 100;
    if (best === null || shortBy < best.shortBy) best = { person: i, shortBy, min: lo };
  }

  if (best === null) return { kind: "none" };
  return {
    kind: "person",
    person: best.person,
    shortByPence: best.shortBy,
    minLimitPence: best.min,
  };
}

export function solveFairSplit(input: SplitInput): SplitResult {
  const exact = solveExact(input, input.limits);
  if (exact === null) return { feasible: false, shortfall: findShortfall(input) };

  const roomOf = [...exact.sigma];
  const pricePence = roundToPence(exact.prices, input.rentPounds * 100);
  const occupantOf = [0, 0, 0];
  roomOf.forEach((room, person) => {
    occupantOf[room] = person;
  });

  const bindingLimits: number[] = [];
  for (let i = 0; i < ROOM_COUNT; i++) {
    const limit = input.limits[i];
    if (limit === null || limit === undefined) continue;
    if (Math.abs(get(exact.prices, get(roomOf, i)) - limit) < 1e-6) bindingLimits.push(i);
  }

  const { ok, maxGain } = verify(input, roomOf, pricePence);
  const result: FeasibleSplit = {
    feasible: true,
    verified: ok,
    roomOf,
    occupantOf,
    pricePence,
    maxSwitchGainPence: maxGain,
    bindingLimits,
  };
  return result;
}

export function challenge(
  input: SplitInput,
  split: FeasibleSplit,
  person: number,
  targetRoom: number,
): ChallengeResult {
  const own = get(split.roomOf, person);
  const costDiffPence = get(split.pricePence, targetRoom) - get(split.pricePence, own);
  const worthDiffPence = (premium(input, person, targetRoom) - premium(input, person, own)) * 100;
  const limit = input.limits[person];
  const overLimitPence =
    limit === null || limit === undefined
      ? 0
      : Math.max(0, get(split.pricePence, targetRoom) - limit * 100);
  return {
    costDiffPence,
    worthDiffPence,
    betterOffStayingPence: costDiffPence - worthDiffPence,
    overLimitPence,
  };
}

/** Who sends whom how much per week, if the contract charges everyone equalSharePence. */
export function settleUp(
  pricePenceByPerson: readonly number[],
  equalSharePence: number,
): Transfer[] {
  const diffs = pricePenceByPerson.map((p, person) => ({ person, diff: p - equalSharePence }));
  const payers = diffs
    .filter((d) => d.diff > 0)
    .sort((a, b) => b.diff - a.diff || a.person - b.person)
    .map((d) => ({ ...d }));
  const receivers = diffs
    .filter((d) => d.diff < 0)
    .sort((a, b) => a.diff - b.diff || a.person - b.person)
    .map((d) => ({ person: d.person, owed: -d.diff }));

  const transfers: Transfer[] = [];
  let pi = 0;
  let ri = 0;
  while (pi < payers.length && ri < receivers.length) {
    const payer = get(payers, pi);
    const receiver = get(receivers, ri);
    const amount = Math.min(payer.diff, receiver.owed);
    if (amount > 0)
      transfers.push({ from: payer.person, to: receiver.person, amountPence: amount });
    payer.diff -= amount;
    receiver.owed -= amount;
    if (payer.diff <= 0) pi++;
    if (receiver.owed <= 0) ri++;
  }
  return transfers;
}

/** Everyone whose limit is below an equal share of the rent, and by how much. */
export function equalSplitOverLimit(input: SplitInput): OverLimit[] {
  const equalPence = (input.rentPounds * 100) / 3;
  const out: OverLimit[] = [];
  input.limits.forEach((limit, person) => {
    if (limit === null) return;
    const over = Math.round(equalPence - limit * 100);
    if (over > 0) out.push({ person, overByPence: over });
  });
  return out;
}

/** Price each person pays, indexed by person. */
export function pricesByPerson(split: FeasibleSplit): number[] {
  return split.roomOf.map((room) => get(split.pricePence, room));
}
