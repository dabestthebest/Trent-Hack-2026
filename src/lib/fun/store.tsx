// XP state for Til Loan Day: daily quests, levels and the current celebration.
// The only thing in the app that persists: {xp, day, done} in localStorage ("tld-xp-v1"). Storage is
// touched only in effects and handlers, every access is wrapped in try/catch, and the app works the
// same (just forgetful) when storage is blocked.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { todayISO } from "@/lib/money/dates";
import type { ISODate } from "@/lib/money/types";

import {
  ACHIEVEMENTS,
  DAILY_QUESTS,
  EMPTY_XP_STATE,
  achievementById,
  applyQuest,
  levelFor,
  parseXpState,
  questById,
  rollDay,
  xpEarnedToday,
  type Achievement,
  type LevelInfo,
  type Quest,
  type RewardId,
  type XpState,
} from "./xp";

export const XP_STORAGE_KEY = "tld-xp-v1";

export type CelebrationKind = "quest" | "achievement" | "level-up";

export interface Celebration {
  /** The quest/achievement id, or "level-{n}" for a level-up. */
  id: string;
  kind: CelebrationKind;
  /** Quest or achievement title; for a level-up, the new level's title. */
  title: string;
  /** XP just awarded. */
  xp: number;
  /** Increments on every celebration so the same one can replay. */
  key: number;
  emoji: string;
  /** Level after this award. */
  level: number;
  /** For a level-up: the quest/achievement that caused it. */
  cause: { title: string; emoji: string } | null;
}

export interface CompleteOptions {
  /** false: award the XP quietly, with no victory toast (e.g. on page load). Default true. */
  celebrate?: boolean | undefined;
}

export interface FunStore {
  xp: number;
  level: LevelInfo;
  /** Today's local date, or null during server rendering and before the first effect. */
  today: ISODate | null;
  questsToday: { quest: Quest; done: boolean }[];
  achievementsToday: { achievement: Achievement; done: boolean }[];
  /** XP earned today across quests and achievements. */
  xpToday: number;
  /** Awards a quest or achievement. Returns the XP awarded (0 if already done today). */
  complete: (id: RewardId, options?: CompleteOptions) => number;
  celebration: Celebration | null;
  dismissCelebration: () => void;
}

function readStored(): XpState {
  try {
    const raw = window.localStorage.getItem(XP_STORAGE_KEY);
    return raw === null ? EMPTY_XP_STATE : parseXpState(JSON.parse(raw));
  } catch {
    return EMPTY_XP_STATE;
  }
}

function writeStored(state: XpState): void {
  try {
    window.localStorage.setItem(XP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / blocked storage: keep going in memory.
  }
}

const FunContext = createContext<FunStore | null>(null);

export function FunProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<XpState>(EMPTY_XP_STATE);
  const [today, setToday] = useState<ISODate | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const stateRef = useRef<XpState>(EMPTY_XP_STATE);
  const loadedRef = useRef(false);
  const keyRef = useRef(0);

  /** Loads storage on first use. Child effects run before ours, so complete() may get here first. */
  const ensureLoaded = useCallback((): XpState => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      stateRef.current = readStored();
    }
    return stateRef.current;
  }, []);

  useEffect(() => {
    const t = todayISO();
    const s = rollDay(ensureLoaded(), t);
    stateRef.current = s;
    setState(s);
    setToday(t);

    // Pick up a new day after the tab sat open overnight, and XP earned in another tab.
    const refresh = () => {
      const now = todayISO();
      setToday(now);
      const next = rollDay(stateRef.current, now);
      if (next !== stateRef.current) {
        stateRef.current = next;
        setState(next);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== XP_STORAGE_KEY) return;
      const next = rollDay(readStored(), todayISO());
      stateRef.current = next;
      setState(next);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [ensureLoaded]);

  const complete = useCallback(
    (id: RewardId, options?: CompleteOptions): number => {
      const now = todayISO();
      const prev = rollDay(ensureLoaded(), now);
      const next = applyQuest(prev, id, now);
      const awarded = next.xp - prev.xp;
      stateRef.current = next;
      setState(next);
      setToday(now);
      if (awarded <= 0) return 0;
      writeStored(next);

      if (options?.celebrate !== false) {
        const quest = questById(id);
        const achievement = achievementById(id);
        const reward = quest ?? achievement;
        const before = levelFor(prev.xp);
        const after = levelFor(next.xp);
        keyRef.current += 1;
        const base = { xp: awarded, key: keyRef.current, level: after.level };
        if (after.level > before.level) {
          setCelebration({
            ...base,
            id: `level-${after.level}`,
            kind: "level-up",
            title: after.title,
            emoji: "🎉",
            cause: reward ? { title: reward.title, emoji: reward.emoji } : null,
          });
        } else {
          setCelebration({
            ...base,
            id,
            kind: achievement ? "achievement" : "quest",
            title: reward?.title ?? "",
            emoji: reward?.emoji ?? "✨",
            cause: null,
          });
        }
      }
      return awarded;
    },
    [ensureLoaded],
  );

  const dismissCelebration = useCallback(() => setCelebration(null), []);

  const value = useMemo<FunStore>(() => {
    const doneToday = (id: string) =>
      today !== null && state.day === today && state.done.includes(id);
    return {
      xp: state.xp,
      level: levelFor(state.xp),
      today,
      questsToday: DAILY_QUESTS.map((quest) => ({ quest, done: doneToday(quest.id) })),
      achievementsToday: ACHIEVEMENTS.map((achievement) => ({
        achievement,
        done: doneToday(achievement.id),
      })),
      xpToday: today === null ? 0 : xpEarnedToday(state, today),
      complete,
      celebration,
      dismissCelebration,
    };
  }, [state, today, complete, celebration, dismissCelebration]);

  return <FunContext.Provider value={value}>{children}</FunContext.Provider>;
}

/** Inert stand-in so a component rendered without <FunProvider> (e.g. in a unit test) still works. */
const FALLBACK: FunStore = {
  xp: 0,
  level: levelFor(0),
  today: null,
  questsToday: DAILY_QUESTS.map((quest) => ({ quest, done: false })),
  achievementsToday: ACHIEVEMENTS.map((achievement) => ({ achievement, done: false })),
  xpToday: 0,
  complete: () => 0,
  celebration: null,
  dismissCelebration: () => {},
};

/** XP state. Outside <FunProvider> it returns an inert store (no XP, complete() returns 0). */
// eslint-disable-next-line react-refresh/only-export-components -- a provider and its hook belong together
export function useFun(): FunStore {
  return useContext(FunContext) ?? FALLBACK;
}
