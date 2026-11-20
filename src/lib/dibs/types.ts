// Shared contract between the fair-split engine and the UI.
// Money is integer pence unless a name ends in "Pounds". Persons and rooms are 0-indexed.
// Rooms: 0 = Box room (baseline), 1 = Middle room, 2 = Big double.

export interface SplitInput {
  /** Total weekly rent in whole pounds (330 in the demo). */
  rentPounds: number;
  /** premiums[person][room] in whole pounds: how much more per week this person would pay
   *  for the room than for the Box room. premiums[person][0] is always 0. */
  premiums: number[][];
  /** Weekly limit per person in whole pounds, or null for "no limit". */
  limits: (number | null)[];
}

export type Shortfall =
  /** Everyone has a limit and the limits add up to less than the rent. */
  | { kind: "limits-sum"; limitsTotalPence: number; rentPence: number }
  /** Raising this one person's limit by shortByPence (to minLimitPence) makes a fair split possible. */
  | { kind: "person"; person: number; shortByPence: number; minLimitPence: number }
  /** No single person's raise (up to the full rent) fixes it. */
  | { kind: "none" };

export interface FeasibleSplit {
  feasible: true;
  /** True only if every post-rounding check passed. The UI shows no badges when false. */
  verified: boolean;
  /** roomOf[person] = room index. */
  roomOf: number[];
  /** occupantOf[room] = person index. */
  occupantOf: number[];
  /** Weekly rent per room in pence; sums to exactly rentPounds * 100. */
  pricePence: number[];
  /** Largest gain anyone could make by switching rooms at these prices, in pence (0 or 1 when verified). */
  maxSwitchGainPence: number;
  /** Persons whose exact (pre-rounding) price equals their limit. */
  bindingLimits: number[];
}

export interface InfeasibleSplit {
  feasible: false;
  shortfall: Shortfall;
}

export type SplitResult = FeasibleSplit | InfeasibleSplit;

export interface ChallengeResult {
  /** price(target room) - price(own room). Negative means the target is cheaper. */
  costDiffPence: number;
  /** (premium[target] - premium[own]) * 100, by the person's own answers. */
  worthDiffPence: number;
  /** costDiffPence - worthDiffPence. Positive: better off staying. 0: equally happy. */
  betterOffStayingPence: number;
  /** How far the target room's price is above the person's limit; 0 if within it or no limit. */
  overLimitPence: number;
}

export interface Transfer {
  from: number;
  to: number;
  amountPence: number;
}

export interface OverLimit {
  person: number;
  overByPence: number;
}

// The engine (src/lib/dibs/fairSplit.ts) exports exactly these functions:
//
//   solveFairSplit(input: SplitInput): SplitResult
//   challenge(input: SplitInput, split: FeasibleSplit, person: number, targetRoom: number): ChallengeResult
//   settleUp(pricePenceByPerson: number[], equalSharePence: number): Transfer[]
//   equalSplitOverLimit(input: SplitInput): OverLimit[]
