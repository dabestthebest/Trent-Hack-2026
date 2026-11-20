// Quest copy and progress helpers shared by the Daily quests card and the XP badge.

import type { FunStore } from "./store";
import { DAILY_QUESTS, type QuestId } from "./xp";

/** Where to earn each quest. Keep in step with where the integration calls complete(). */
export const QUEST_HINTS: Record<QuestId, string> = {
  "check-runway": "Open the Runway tab",
  "preview-plan": "Tap a plan under “Can I say yes?”",
  "skip-something": "Hit “Skip it” on a plan",
  "read-invite": "Paste a group-chat invite under “Can I say yes?”",
  "fair-split": "Finish a fair split on the Dibs tab",
  "ask-parent": "Open “Ask a parent to help” on a big bill",
};

export function questProgress(fun: FunStore): { done: number; total: number } {
  return { done: fun.questsToday.filter((q) => q.done).length, total: DAILY_QUESTS.length };
}

/** "3/6 done · +55 XP today" */
export function progressLine(fun: FunStore): string {
  const { done, total } = questProgress(fun);
  return `${done}/${total} done · +${fun.xpToday} XP today`;
}

export const MADE_IT_HINT = "Reach loan day without dipping into your overdraft";
