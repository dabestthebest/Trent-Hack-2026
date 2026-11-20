import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FunProvider, XP_STORAGE_KEY, useFun } from "@/lib/fun/store";
import type { RewardId } from "@/lib/fun/xp";

import { DailyQuests } from "./DailyQuests";
import { PennyTip } from "./PennyTip";
import { Victory } from "./Victory";
import { XpBadge } from "./XpBadge";

let lastAward = -1;

// Node 26 ships its own (disabled) localStorage that hides jsdom's, so give each test a fresh one.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}
let storage = new MemoryStorage();

function Doer({ id, quiet = false }: { id: RewardId; quiet?: boolean }) {
  const { complete } = useFun();
  return (
    <button type="button" onClick={() => (lastAward = complete(id, { celebrate: !quiet }))}>
      do {id}
    </button>
  );
}

function renderFun() {
  return render(
    <FunProvider>
      <XpBadge />
      <Doer id="skip-something" />
      <Doer id="fair-split" />
      <Doer id="made-it" />
      <Doer id="check-runway" quiet />
      <DailyQuests />
      <Victory />
    </FunProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(new Date(2026, 10, 20, 12, 0, 0));
  storage = new MemoryStorage();
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  lastAward = -1;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("FunProvider + Victory", () => {
  it("awards XP once per day, persists it, and celebrates", () => {
    renderFun();
    expect(screen.getByTestId("quest-progress")).toHaveTextContent("0/6 done · +0 XP today");

    fireEvent.click(screen.getByText("do skip-something"));
    expect(lastAward).toBe(25);
    expect(screen.getByTestId("quest-progress")).toHaveTextContent("1/6 done · +25 XP today");
    expect(screen.getByText("+25 XP · Skip something you don't need")).toBeInTheDocument();
    expect(screen.getByTestId("victory-live")).toHaveTextContent(
      "Quest done: Skip something you don't need. Plus 25 XP.",
    );
    expect(JSON.parse(storage.getItem(XP_STORAGE_KEY) ?? "null")).toEqual({
      xp: 25,
      day: "2026-11-20",
      done: ["skip-something"],
    });

    fireEvent.click(screen.getByText("do skip-something"));
    expect(lastAward).toBe(0);

    // Auto-dismisses; the live region keeps its words.
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(screen.queryByText("+25 XP · Skip something you don't need")).not.toBeInTheDocument();
    expect(screen.getByTestId("victory-live")).toHaveTextContent("Skip something you don't need");

    // The done row says "Done" in text, not just colour.
    const list = screen.getByRole("list", { name: "Today's quests" });
    const row = within(list).getByText("Skip something you don't need").closest("li");
    expect(row).toHaveTextContent("Done");
  });

  it("shows the achievement toast, and a newer win replaces the toast", () => {
    renderFun();
    fireEvent.click(screen.getByText("do made-it"));
    expect(screen.getByText("🏁 On track for loan day! +50 XP")).toBeInTheDocument();
    fireEvent.click(screen.getByText("do fair-split"));
    expect(lastAward).toBe(20);
    expect(screen.queryByText("🏁 On track for loan day! +50 XP")).not.toBeInTheDocument();
    expect(screen.getByText("+20 XP · Split rent fairly with Dibs")).toBeInTheDocument();
    expect(screen.getByTestId("quest-progress")).toHaveTextContent("1/6 done · +70 XP today");
  });

  it("levels up at 100 XP", () => {
    storage.setItem(
      XP_STORAGE_KEY,
      JSON.stringify({ xp: 90, day: "2026-11-19", done: ["skip-something"] }),
    );
    renderFun();
    // Yesterday's quests are cleared; lifetime XP is kept.
    expect(screen.getByTestId("quest-progress")).toHaveTextContent("0/6 done · +0 XP today");
    fireEvent.click(screen.getByText("do skip-something"));
    expect(lastAward).toBe(25);
    expect(screen.getByText("Level 2: Meal Deal Strategist!")).toBeInTheDocument();
    expect(screen.getByText("+25 XP · Skip something you don't need")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Level 2, Meal Deal Strategist, 115 XP/ }));
  });

  it("quiet completes award XP without a toast", () => {
    renderFun();
    fireEvent.click(screen.getByText("do check-runway"));
    expect(lastAward).toBe(10);
    expect(screen.queryByText(/\+10 XP · Check your runway/)).not.toBeInTheDocument();
  });

  it("never throws when storage is blocked", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: storage is blocked");
      },
    });
    renderFun();
    fireEvent.click(screen.getByText("do fair-split"));
    expect(lastAward).toBe(20);
    expect(screen.getByTestId("quest-progress")).toHaveTextContent("1/6 done · +20 XP today");
  });

  it("opens today's quests from the badge", () => {
    renderFun();
    fireEvent.click(screen.getByRole("button", { name: /Level 1, Fresh Fresher, 0 XP/ }));
    expect(screen.getByText("Quests reset at midnight. XP stays on this device only."));
  });

  it("renders on the server without touching storage", () => {
    const html = renderToString(
      <FunProvider>
        <XpBadge />
        <DailyQuests />
        <Victory />
      </FunProvider>,
    );
    expect(html).toContain("Daily quests");
  });
});

describe("PennyTip", () => {
  it("shows the tip as a note and cycles tips", () => {
    render(
      <PennyTip
        tips={[
          { mood: "chill", text: "First tip" },
          { mood: "happy", text: "Second tip" },
        ]}
      />,
    );
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Penny's tip");
    expect(note).toHaveTextContent("First tip");
    fireEvent.click(screen.getByRole("button", { name: /Next tip/ }));
    expect(screen.getByRole("note")).toHaveTextContent("Second tip");
  });
});
