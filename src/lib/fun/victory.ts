// Words for the victory toast and its screen-reader announcement.

import type { Celebration } from "./store";
import { rankFor } from "./xp";

/** Visible toast text. */
export function victoryText(c: Celebration): { main: string; sub: string | null } {
  switch (c.kind) {
    case "quest":
      return { main: `+${c.xp} XP · ${c.title}`, sub: null };
    case "achievement":
      return { main: `${c.emoji} ${c.title}! +${c.xp} XP`, sub: null };
    case "level-up": {
      const rank = rankFor(c.level);
      const newRank = rank.fromLevel === c.level && c.level > 1;
      return {
        main: newRank
          ? `Level ${c.level}: ${c.title}! New rank: ${rank.emoji} ${rank.name}`
          : `Level ${c.level}: ${c.title}!`,
        sub: c.cause ? `+${c.xp} XP · ${c.cause.title}` : `+${c.xp} XP`,
      };
    }
  }
}

/** What the live region says (no emoji, so it reads cleanly). */
export function victoryAnnouncement(c: Celebration): string {
  switch (c.kind) {
    case "quest":
      return `Quest done: ${c.title}. Plus ${c.xp} XP.`;
    case "achievement":
      return `${c.title}! Plus ${c.xp} XP.`;
    case "level-up":
      return `Level up! Level ${c.level}: ${c.title}. Plus ${c.xp} XP${c.cause ? ` for ${c.cause.title}` : ""}.`;
  }
}
