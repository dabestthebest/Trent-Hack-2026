import { describe, expect, it } from "vitest";

import { clampHabit, dailyPence, timesLabel, weeklyPence, type Habit } from "./habits";

const h = (label: string, timesPerWeek: number, costPence: number): Habit => ({
  id: label,
  label,
  timesPerWeek,
  costPence,
  estimated: false,
});

describe("habits", () => {
  it("adds up a week and a day", () => {
    const habits = [h("Eating out", 2, 1200), h("Bus", 8, 200), h("Coffee", 5, 300)];
    // 2400 + 1600 + 1500 = 5500 a week -> 785.7 a day, rounded up
    expect(weeklyPence(habits)).toBe(5500);
    expect(dailyPence(habits)).toBe(786);
    expect(dailyPence([])).toBe(0);
  });

  it("clamps silly values", () => {
    expect(clampHabit(h("  ", 99, 999999))).toMatchObject({
      label: "Habit",
      timesPerWeek: 21,
      costPence: 10000,
    });
    expect(clampHabit(h("Gym", 0, -5))).toMatchObject({ timesPerWeek: 0.25, costPence: 0 });
    expect(clampHabit(h("x".repeat(50), Number.NaN, 12.6)).label).toHaveLength(30);
  });

  it("describes how often", () => {
    expect([timesLabel(7), timesLabel(1), timesLabel(0.5), timesLabel(2), timesLabel(4.5)]).toEqual(
      ["every day", "once a week", "every 2 weeks", "2× a week", "4.5× a week"],
    );
  });
});
