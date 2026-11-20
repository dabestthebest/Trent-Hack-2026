// Demo data for Dibs. The house and housemates are fictional.

export const RENT_POUNDS = 330;

export const HOUSE = {
  name: "Demo house",
  area: "Lenton",
  bedrooms: 3,
} as const;

export const ROOMS = [
  { id: "box", name: "Box room", blurb: "Single bed · above the stairs", emoji: "📦" },
  {
    id: "middle",
    name: "Middle room",
    blurb: "Small double · quiet, back of the house",
    emoji: "🌙",
  },
  { id: "double", name: "Big double", blurb: "Double bed · bay window", emoji: "🪟" },
] as const;

/** Defaults for the human player (person 0). Editable on the Answers screen. */
export const PLAYER_DEFAULT = {
  name: "You",
  premiums: [0, 5, 25],
  limitOn: true,
  limitPounds: 120,
} as const;

/** Bot housemates (persons 1 and 2). Their limits are public; their premiums stay hidden until the reveal. */
export const BOTS = [
  {
    name: "Sam",
    premiums: [0, 30, 36],
    limitPounds: 104 as number | null,
    blurb: "Night owl. Smaller loan this year. Wants somewhere quiet.",
  },
  {
    name: "Alex",
    premiums: [0, 12, 45],
    limitPounds: null as number | null,
    blurb: "Gym every morning, owns a lot of stuff. Wants space.",
  },
] as const;

export const PREMIUM_MIN = -50;
export const PREMIUM_MAX = 110;
export const LIMIT_MIN = 50;
export const LIMIT_MAX = 330;
export const NAME_MAX_LENGTH = 12;

/** Used for the "≈ N meal deals" line on the settle-up card. A round £4 (see docs/FACT-CHECK.md). */
export const MEAL_DEAL_PENCE = 400;
