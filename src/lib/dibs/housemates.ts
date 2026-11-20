// Housemate state for the Dibs flow and conversion to the engine's input.

import {
  BOTS,
  LIMIT_MAX,
  LIMIT_MIN,
  NAME_MAX_LENGTH,
  PLAYER_DEFAULT,
  PREMIUM_MAX,
  PREMIUM_MIN,
  RENT_POUNDS,
} from "./fixture";
import type { SplitInput } from "./types";

export type Mode = "bots" | "pass";

export interface Housemate {
  name: string;
  /** Premium over the Box room for [Middle room, Big double], whole pounds. */
  middle: number;
  double: number;
  limitOn: boolean;
  limitPounds: number;
  isBot: boolean;
  blurb: string;
}

export function initialHousemates(mode: Mode, humans: 2 | 3): Housemate[] {
  const player: Housemate = {
    name: PLAYER_DEFAULT.name,
    middle: PLAYER_DEFAULT.premiums[1],
    double: PLAYER_DEFAULT.premiums[2],
    limitOn: PLAYER_DEFAULT.limitOn,
    limitPounds: PLAYER_DEFAULT.limitPounds,
    isBot: false,
    blurb: "",
  };
  const bots: Housemate[] = BOTS.map((b) => ({
    name: b.name,
    middle: b.premiums[1],
    double: b.premiums[2],
    limitOn: b.limitPounds !== null,
    limitPounds: b.limitPounds ?? 120,
    isBot: true,
    blurb: b.blurb,
  }));
  if (mode === "bots") return [player, ...bots];

  // Pass the phone: humans replace the bots in order (Sam's seat, then Alex's).
  const seats: Housemate[] = [
    { ...player, name: "Player 1", limitOn: false, middle: 0, double: 0 },
  ];
  for (let seat = 1; seat < 3; seat++) {
    const bot = bots[seat - 1];
    if (bot === undefined) continue;
    if (seat < humans) {
      seats.push({
        name: `Player ${seat + 1}`,
        middle: 0,
        double: 0,
        limitOn: false,
        limitPounds: 120,
        isBot: false,
        blurb: "",
      });
    } else {
      seats.push(bot);
    }
  }
  return seats;
}

export function toSplitInput(people: readonly Housemate[]): SplitInput {
  return {
    rentPounds: RENT_POUNDS,
    premiums: people.map((p) => [0, p.middle, p.double]),
    limits: people.map((p) => (p.limitOn ? p.limitPounds : null)),
  };
}

export interface FieldErrors {
  name?: string;
  middle?: string;
  double?: string;
  limit?: string;
}

export function validateHousemate(p: Housemate): FieldErrors {
  const errors: FieldErrors = {};
  const trimmed = p.name.trim();
  if (trimmed.length < 1 || trimmed.length > NAME_MAX_LENGTH)
    errors.name = `Use 1–${NAME_MAX_LENGTH} characters.`;
  const premiumOk = (v: number) => Number.isInteger(v) && v >= PREMIUM_MIN && v <= PREMIUM_MAX;
  if (!premiumOk(p.middle))
    errors.middle = `Whole pounds from −£${-PREMIUM_MIN} to +£${PREMIUM_MAX}.`;
  if (!premiumOk(p.double))
    errors.double = `Whole pounds from −£${-PREMIUM_MIN} to +£${PREMIUM_MAX}.`;
  if (
    p.limitOn &&
    !(Number.isInteger(p.limitPounds) && p.limitPounds >= LIMIT_MIN && p.limitPounds <= LIMIT_MAX)
  ) {
    errors.limit = `Whole pounds from £${LIMIT_MIN} to £${LIMIT_MAX}.`;
  }
  return errors;
}

export function hasErrors(e: FieldErrors): boolean {
  return Object.keys(e).length > 0;
}
