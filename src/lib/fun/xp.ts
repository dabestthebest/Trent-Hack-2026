// XP, levels and daily quests for Til Loan Day. Pure functions only: no React, no storage, no clock.
// "today" is always passed in as an ISO date ("YYYY-MM-DD"), so a day rolls over exactly at local
// midnight and tests never depend on the real date.

import type { ISODate } from "@/lib/money/types";

export type QuestId =
  "check-runway" | "preview-plan" | "skip-something" | "read-invite" | "fair-split" | "ask-parent";

export type AchievementId = "made-it";

export type RewardId = QuestId | AchievementId;

export interface Quest {
  id: QuestId;
  emoji: string;
  title: string;
  xp: number;
}

export interface Achievement {
  id: AchievementId;
  emoji: string;
  title: string;
  xp: number;
}

/** Six small, repeatable money habits. Each pays out once per calendar day. */
export const DAILY_QUESTS: readonly Quest[] = [
  { id: "check-runway", emoji: "👀", title: "Check your runway", xp: 10 },
  { id: "preview-plan", emoji: "🔮", title: "Preview a plan before you say yes", xp: 15 },
  { id: "skip-something", emoji: "🫙", title: "Skip something you don't need", xp: 25 },
  { id: "read-invite", emoji: "🤖", title: "Paste an invite and let the AI read it", xp: 15 },
  { id: "fair-split", emoji: "🏠", title: "Split rent fairly with Dibs", xp: 20 },
  { id: "ask-parent", emoji: "💌", title: "Draft an ask-a-parent message", xp: 15 },
];

/** Bigger one-offs (still at most once per day). */
export const ACHIEVEMENTS: readonly Achievement[] = [
  // Awarded when the runway has no overdraft day at the usual daily spend.
  { id: "made-it", emoji: "🏁", title: "On track for loan day", xp: 50 },
];

export const XP_PER_LEVEL = 100;

/** Level titles, level 1 first. Every level past the last one keeps the last title. */
export const LEVEL_TITLES: readonly string[] = [
  "Fresh Fresher",
  "Meal Deal Strategist",
  "Budget Bestie",
  "Overdraft Dodger",
  "Loan Day Legend",
];

/** Ranks scale with level: a coarser tier on top of the level titles. */
export interface Rank {
  name: string;
  emoji: string;
  /** First level of this rank. */
  fromLevel: number;
}

export const RANKS: readonly Rank[] = [
  { name: "Bronze", emoji: "🥉", fromLevel: 1 },
  { name: "Silver", emoji: "🥈", fromLevel: 3 },
  { name: "Gold", emoji: "🥇", fromLevel: 5 },
  { name: "Platinum", emoji: "💎", fromLevel: 8 },
  { name: "Diamond", emoji: "👑", fromLevel: 12 },
];

export function rankFor(level: number): Rank {
  let rank = RANKS[0] ?? { name: "Bronze", emoji: "🥉", fromLevel: 1 };
  for (const r of RANKS) if (level >= r.fromLevel) rank = r;
  return rank;
}

export interface LevelInfo {
  /** 1-based. */
  level: number;
  title: string;
  rank: Rank;
  /** XP earned inside the current level (0 … perLevel-1). */
  intoLevel: number;
  perLevel: number;
  /** Total XP at which the next level starts. */
  nextLevelAt: number;
}

function cleanXp(xp: number): number {
  return Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
}

export function levelFor(xp: number): LevelInfo {
  const total = cleanXp(xp);
  const level = Math.floor(total / XP_PER_LEVEL) + 1;
  const titleIndex = Math.min(level, LEVEL_TITLES.length) - 1;
  return {
    level,
    title: LEVEL_TITLES[titleIndex] ?? "Loan Day Legend",
    rank: rankFor(level),
    intoLevel: total - (level - 1) * XP_PER_LEVEL,
    perLevel: XP_PER_LEVEL,
    nextLevelAt: level * XP_PER_LEVEL,
  };
}

export interface XpState {
  /** Lifetime XP. Never resets. */
  xp: number;
  /** The day `done` belongs to, or null before anything has happened. */
  day: ISODate | null;
  /** Quest and achievement ids already paid out on `day`. */
  done: string[];
}

export const EMPTY_XP_STATE: XpState = { xp: 0, day: null, done: [] };

const QUEST_BY_ID = new Map<string, Quest>(DAILY_QUESTS.map((q) => [q.id, q]));
const ACHIEVEMENT_BY_ID = new Map<string, Achievement>(ACHIEVEMENTS.map((a) => [a.id, a]));

export function questById(id: string): Quest | undefined {
  return QUEST_BY_ID.get(id);
}

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENT_BY_ID.get(id);
}

export function isRewardId(id: string): id is RewardId {
  return QUEST_BY_ID.has(id) || ACHIEVEMENT_BY_ID.has(id);
}

/** XP a reward is worth, or 0 for an unknown id. */
export function xpFor(id: string): number {
  return QUEST_BY_ID.get(id)?.xp ?? ACHIEVEMENT_BY_ID.get(id)?.xp ?? 0;
}

/** Moves the state onto `today`: a new day empties `done` but keeps the lifetime XP. */
export function rollDay(state: XpState, today: ISODate): XpState {
  if (state.day === today) return state;
  return { xp: state.xp, day: today, done: [] };
}

export function isDoneToday(state: XpState, id: string, today: ISODate): boolean {
  return state.day === today && state.done.includes(id);
}

/**
 * Pays out a quest or achievement for `today`. Re-completing the same id on the same day (or an
 * unknown id) earns 0 XP and returns the (rolled-over) state unchanged. XP awarded is
 * `next.xp - state.xp`.
 */
export function applyQuest(state: XpState, id: string, today: ISODate): XpState {
  const rolled = rollDay(state, today);
  const xp = xpFor(id);
  if (xp === 0 || rolled.done.includes(id)) return rolled;
  return { xp: cleanXp(rolled.xp) + xp, day: today, done: [...rolled.done, id] };
}

/** XP earned on `today` (quests and achievements). */
export function xpEarnedToday(state: XpState, today: ISODate): number {
  if (state.day !== today) return 0;
  return state.done.reduce((sum, id) => sum + xpFor(id), 0);
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Reads a stored state defensively: anything malformed becomes a clean empty state. */
export function parseXpState(raw: unknown): XpState {
  if (typeof raw !== "object" || raw === null) return EMPTY_XP_STATE;
  const r = raw as { xp?: unknown; day?: unknown; done?: unknown };
  const xp = typeof r.xp === "number" ? cleanXp(r.xp) : 0;
  const day = typeof r.day === "string" && ISO_RE.test(r.day) ? r.day : null;
  const rawDone: unknown[] = Array.isArray(r.done) ? (r.done as unknown[]) : [];
  const done =
    day === null
      ? []
      : [...new Set(rawDone.filter((d): d is string => typeof d === "string" && isRewardId(d)))];
  return { xp, day, done };
}
