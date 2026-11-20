import { describe, expect, it } from "vitest";

import { buildCard, cardLevel, cardRank, parseCard, serializeCard } from "./friendCard";

describe("friend cards", () => {
  it("round-trips only the fields you chose to share", () => {
    const card = buildCard(
      "Tong",
      { level: true, xp: true, quests: false, saved: false },
      { xp: 250, questsToday: 3, savedPence: 5500 },
    );
    expect(card).toEqual({ name: "Tong", level: 3, xp: 250, questsToday: null, savedPence: null });
    const text = serializeCard(card);
    expect(text.startsWith("Til Loan Day friend card")).toBe(true);
    expect(parseCard(text)).toEqual({ ok: true, card });
    expect(cardRank(card)?.name).toBe("Silver");
  });

  it("survives being pasted into a chat with extra text around it", () => {
    const text = `here's mine lol\n${serializeCard(buildCard("Sam", { level: true, xp: false, quests: true, saved: true }, { xp: 420, questsToday: 6, savedPence: 1234 }))}\nsent from my phone`;
    const r = parseCard(text);
    expect(r.ok && r.card).toEqual({
      name: "Sam",
      level: 5,
      xp: null,
      questsToday: 6,
      savedPence: 1234,
    });
    if (r.ok) expect([cardLevel(r.card), cardRank(r.card)?.name]).toEqual([5, "Gold"]);
  });

  it("rejects or cleans untrusted files", () => {
    expect(parseCard("hello").ok).toBe(false);
    expect(parseCard("{not json}").ok).toBe(false);
    expect(parseCard('{"app":"other","v":1,"name":"x"}').ok).toBe(false);
    expect(parseCard("x".repeat(5000)).ok).toBe(false);
    const evil = parseCard(
      '{"app":"til-loan-day","v":1,"name":"<script>alert(1)</script>Bob\\u0007","xp":1e12,"questsToday":-4,"savedPence":"lots","level":2.7}',
    );
    expect(evil).toEqual({
      ok: true,
      card: {
        name: "scriptalert(1)/scrip",
        level: 2,
        xp: 1_000_000,
        questsToday: 0,
        savedPence: null,
      },
    });
  });
});
