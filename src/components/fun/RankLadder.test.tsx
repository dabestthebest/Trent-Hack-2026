import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RankLadder, xpForLevel } from "./RankLadder";

describe("RankLadder", () => {
  it("shows every rank, where you are, and the XP to the ones above", () => {
    render(<RankLadder xp={250} />);
    const items = within(screen.getByRole("list", { name: "Rank ladder" })).getAllByRole(
      "listitem",
    );
    expect(items.map((li) => li.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "🥉Bronze · from Lv 1 Reached",
      "🥈Silver · from Lv 3 You're here",
      "🥇Gold · from Lv 5 150 XP to go",
      "💎Platinum · from Lv 8 450 XP to go",
      "👑Diamond · from Lv 12 850 XP to go",
    ]);
    expect(items[1]).toHaveAttribute("aria-current", "step");
  });

  it("maps levels to XP", () => {
    expect([xpForLevel(1), xpForLevel(3), xpForLevel(12)]).toEqual([0, 200, 1100]);
  });
});
