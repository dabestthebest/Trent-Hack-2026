// Friends without accounts: a small text file holding only what you chose to share (name, level,
// XP, quests today, savings jar). Imported files are untrusted: everything is validated and
// clamped, and the rank is worked out from the level rather than taken from the file.

import { levelFor, rankFor, type Rank } from "./xp";

export const CARD_APP = "til-loan-day";
export const CARD_VERSION = 1;
export const MAX_CARD_BYTES = 4000;

export interface FriendCard {
  name: string;
  level: number | null;
  xp: number | null;
  questsToday: number | null;
  savedPence: number | null;
}

export interface ShareChoices {
  level: boolean;
  xp: boolean;
  quests: boolean;
  saved: boolean;
}

export function buildCard(
  name: string,
  choices: ShareChoices,
  me: { xp: number; questsToday: number; savedPence: number },
): FriendCard {
  return {
    name: cleanName(name) || "A friend",
    level: choices.level ? levelFor(me.xp).level : null,
    xp: choices.xp ? Math.floor(me.xp) : null,
    questsToday: choices.quests ? me.questsToday : null,
    savedPence: choices.saved ? Math.round(me.savedPence) : null,
  };
}

/** Human-readable header plus one JSON line, so it survives being pasted into a chat. */
export function serializeCard(card: FriendCard): string {
  const payload = { app: CARD_APP, v: CARD_VERSION, ...card };
  return [
    "Til Loan Day friend card",
    `Only what ${card.name} chose to share. Import it in Til Loan Day → Friends.`,
    "---",
    JSON.stringify(payload),
    "",
  ].join("\n");
}

function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // Drop control characters and angle brackets, collapse spaces, cap the length.
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 32 || code === 127 || ch === "<" || ch === ">") continue;
    out += ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, 20);
}

function intOrNull(raw: unknown, min: number, max: number): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

export type ParseResult = { ok: true; card: FriendCard } | { ok: false; error: string };

export function parseCard(text: string): ParseResult {
  if (text.length > MAX_CARD_BYTES)
    return { ok: false, error: "That file is too big to be a friend card." };
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start)
    return { ok: false, error: "That doesn't look like a Til Loan Day friend card." };
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, error: "That friend card is damaged. Ask them to send it again." };
  }
  if (typeof raw !== "object" || raw === null)
    return { ok: false, error: "That doesn't look like a Til Loan Day friend card." };
  const r = raw as Record<string, unknown>;
  if (r["app"] !== CARD_APP || r["v"] !== CARD_VERSION) {
    return { ok: false, error: "That doesn't look like a Til Loan Day friend card." };
  }
  const name = cleanName(r["name"]);
  if (name === "") return { ok: false, error: "That friend card has no name." };
  return {
    ok: true,
    card: {
      name,
      level: intOrNull(r["level"], 1, 1000),
      xp: intOrNull(r["xp"], 0, 1_000_000),
      questsToday: intOrNull(r["questsToday"], 0, 6),
      savedPence: intOrNull(r["savedPence"], 0, 100_000_000),
    },
  };
}

/** The rank we show for a card: from its XP if shared, else its level, else unknown. */
export function cardRank(card: FriendCard): Rank | null {
  if (card.xp !== null) return levelFor(card.xp).rank;
  if (card.level !== null) return rankFor(card.level);
  return null;
}

export function cardLevel(card: FriendCard): number | null {
  if (card.xp !== null) return levelFor(card.xp).level;
  return card.level;
}
