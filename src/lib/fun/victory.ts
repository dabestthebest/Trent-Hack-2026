// Words for the victory toast and its screen-reader announcement.

import type { Celebration } from "./store";

/** Visible toast text. */
export function victoryText(c: Celebration): { main: string; sub: string | null } {
  switch (c.kind) {
    case "quest":
      return { main: `+${c.xp} XP · ${c.title}`, sub: null };
    case "achievement":
      return { main: `${c.emoji} ${c.title}! +${c.xp} XP`, sub: null };
    case "level-up":
      return {
        main: `Level ${c.level}: ${c.title}!`,
        sub: c.cause ? `+${c.xp} XP · ${c.cause.title}` : `+${c.xp} XP`,
      };
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
