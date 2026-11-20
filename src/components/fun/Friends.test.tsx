import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MoneyProvider } from "@/lib/money/store";

import { FRIENDS_KEY, Friends } from "./Friends";

// Some Node + jsdom combinations have no localStorage; use a simple in-memory one.
const memory = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, String(v)),
    removeItem: (k: string) => void memory.delete(k),
    clear: () => memory.clear(),
    key: (i: number) => [...memory.keys()][i] ?? null,
    get length() {
      return memory.size;
    },
  },
});

const SAM =
  'Til Loan Day friend card\n---\n{"app":"til-loan-day","v":1,"name":"Sam","level":5,"xp":420,"questsToday":4,"savedPence":5500}';

describe("Friends", () => {
  it("keeps friends on the device between visits", async () => {
    window.localStorage.removeItem(FRIENDS_KEY);
    const first = render(
      <MoneyProvider>
        <Friends />
      </MoneyProvider>,
    );
    fireEvent.change(screen.getByLabelText(/paste the text they sent you/), {
      target: { value: SAM },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add friend" }));
    expect(
      await screen.findByText("Added Sam. Let the friendly competition begin 🏁"),
    ).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(FRIENDS_KEY)).toContain("Sam"));
    first.unmount();

    render(
      <MoneyProvider>
        <Friends />
      </MoneyProvider>,
    );
    expect(await screen.findByRole("list", { name: "Your friends" })).toHaveTextContent("Sam");
    fireEvent.click(screen.getByRole("button", { name: "Forget all friends" }));
    await waitFor(() => expect(window.localStorage.getItem(FRIENDS_KEY)).not.toContain("Sam"));
  });

  it("ignores junk in storage", async () => {
    window.localStorage.setItem(FRIENDS_KEY, '{"cards":["nope",42,{"x":1}]}');
    render(
      <MoneyProvider>
        <Friends />
      </MoneyProvider>,
    );
    await waitFor(() =>
      expect(screen.queryByRole("list", { name: "Your friends" })).not.toBeInTheDocument(),
    );
  });
});
