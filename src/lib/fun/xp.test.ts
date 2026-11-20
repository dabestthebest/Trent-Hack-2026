import { describe, expect, it } from "vitest";

import {
  ACHIEVEMENTS,
  DAILY_QUESTS,
  EMPTY_XP_STATE,
  applyQuest,
  isDoneToday,
  levelFor,
  parseXpState,
  rollDay,
  xpEarnedToday,
  type XpState,
} from "./xp";

const DAY1 = "2026-11-20";
const DAY2 = "2026-11-21";

describe("quest catalogue", () => {
  it("has the six daily quests with their XP", () => {
    expect(DAILY_QUESTS.map((q) => [q.id, q.xp])).toEqual([
      ["check-runway", 10],
      ["preview-plan", 15],
      ["skip-something", 25],
      ["read-invite", 15],
      ["fair-split", 20],
      ["ask-parent", 15],
    ]);
    expect(DAILY_QUESTS.find((q) => q.id === "skip-something")?.title).toBe(
      "Skip something you don't need",
    );
  });

  it("has the made-it achievement", () => {
    expect(ACHIEVEMENTS).toEqual([
      { id: "made-it", emoji: "🏁", title: "On track for loan day", xp: 50 },
    ]);
  });
});

describe("levelFor", () => {
  it("starts at level 1", () => {
    expect(levelFor(0)).toEqual({
      level: 1,
      title: "Fresh Fresher",
      intoLevel: 0,
      perLevel: 100,
      nextLevelAt: 100,
      rank: { name: "Bronze", emoji: "🥉", fromLevel: 1 },
    });
  });

  it("is 100 XP per level", () => {
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toMatchObject({ level: 2, title: "Meal Deal Strategist", intoLevel: 0 });
    expect(levelFor(140)).toMatchObject({ level: 2, intoLevel: 40, nextLevelAt: 200 });
    expect(levelFor(250).title).toBe("Budget Bestie");
    expect(levelFor(399).title).toBe("Overdraft Dodger");
    expect(levelFor(400)).toMatchObject({ level: 5, title: "Loan Day Legend" });
    expect(levelFor(1234)).toMatchObject({ level: 13, title: "Loan Day Legend", intoLevel: 34 });
  });

  it("treats junk as 0", () => {
    expect(levelFor(-5).level).toBe(1);
    expect(levelFor(Number.NaN).intoLevel).toBe(0);
  });
});

describe("applyQuest", () => {
  it("awards a quest once per day", () => {
    const a = applyQuest(EMPTY_XP_STATE, "skip-something", DAY1);
    expect(a).toEqual({ xp: 25, day: DAY1, done: ["skip-something"] });
    const b = applyQuest(a, "skip-something", DAY1);
    expect(b.xp - a.xp).toBe(0);
    expect(b).toEqual(a);
  });

  it("stacks different quests on the same day", () => {
    let s: XpState = EMPTY_XP_STATE;
    s = applyQuest(s, "check-runway", DAY1);
    s = applyQuest(s, "preview-plan", DAY1);
    s = applyQuest(s, "fair-split", DAY1);
    expect(s.xp).toBe(45);
    expect(xpEarnedToday(s, DAY1)).toBe(45);
    expect(isDoneToday(s, "preview-plan", DAY1)).toBe(true);
    expect(isDoneToday(s, "ask-parent", DAY1)).toBe(false);
  });

  it("resets the daily list on a new day but keeps lifetime XP", () => {
    const d1 = applyQuest(EMPTY_XP_STATE, "check-runway", DAY1);
    const d2 = applyQuest(d1, "check-runway", DAY2);
    expect(d2).toEqual({ xp: 20, day: DAY2, done: ["check-runway"] });
    expect(isDoneToday(d2, "check-runway", DAY1)).toBe(false);
    expect(xpEarnedToday(d2, DAY1)).toBe(0);
  });

  it("pays the achievement once per day", () => {
    const a = applyQuest(EMPTY_XP_STATE, "made-it", DAY1);
    expect(a.xp).toBe(50);
    expect(applyQuest(a, "made-it", DAY1).xp).toBe(50);
    expect(applyQuest(a, "made-it", DAY2).xp).toBe(100);
  });

  it("ignores unknown ids", () => {
    expect(applyQuest(EMPTY_XP_STATE, "free-money", DAY1)).toEqual({
      xp: 0,
      day: DAY1,
      done: [],
    });
  });

  it("does not mutate its input", () => {
    const s: XpState = { xp: 10, day: DAY1, done: ["check-runway"] };
    applyQuest(s, "fair-split", DAY1);
    expect(s).toEqual({ xp: 10, day: DAY1, done: ["check-runway"] });
  });
});

describe("rollDay", () => {
  it("keeps the same object on the same day", () => {
    const s: XpState = { xp: 5, day: DAY1, done: [] };
    expect(rollDay(s, DAY1)).toBe(s);
  });
});

describe("parseXpState", () => {
  it("accepts a good stored state", () => {
    expect(parseXpState({ xp: 140, day: DAY1, done: ["check-runway", "made-it"] })).toEqual({
      xp: 140,
      day: DAY1,
      done: ["check-runway", "made-it"],
    });
  });

  it("cleans up junk", () => {
    expect(parseXpState(null)).toEqual(EMPTY_XP_STATE);
    expect(parseXpState("hi")).toEqual(EMPTY_XP_STATE);
    expect(parseXpState({ xp: -3, day: "yesterday", done: ["check-runway"] })).toEqual({
      xp: 0,
      day: null,
      done: [],
    });
    expect(
      parseXpState({ xp: 12.7, day: DAY1, done: ["check-runway", "check-runway", 3, "nope"] }),
    ).toEqual({ xp: 12, day: DAY1, done: ["check-runway"] });
  });
});

describe("ranks", () => {
  it("scale with level", async () => {
    const { rankFor, levelFor } = await import("./xp");
    expect(rankFor(1).name).toBe("Bronze");
    expect(rankFor(2).name).toBe("Bronze");
    expect(rankFor(3).name).toBe("Silver");
    expect(rankFor(5).name).toBe("Gold");
    expect(rankFor(8).name).toBe("Platinum");
    expect(rankFor(12).name).toBe("Diamond");
    expect(rankFor(40).name).toBe("Diamond");
    expect(levelFor(250).rank).toMatchObject({ name: "Silver", emoji: "🥈" });
  });
});
