import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MoneyProvider } from "@/lib/money/store";

import { RunwayPage } from "./RunwayPage";

// The page only uses <Link>; render it as a plain anchor so no router is needed.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  // Pin "today" to the demo day (Fri 20 Nov 2026), faking only Date so timers stay real.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 20, 12, 0, 0));
  // Reduced motion: the big number jumps straight to its new value.
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.useRealTimers();
});

function renderPage() {
  return render(
    <MoneyProvider>
      <RunwayPage />
    </MoneyProvider>,
  );
}

const safeNumber = () => screen.getByTestId("safe-per-day").textContent;
const moneyIn = () => within(screen.getByRole("region", { name: "💼 Money coming in" }));
const subs = () => within(screen.getByRole("region", { name: "🔁 Subscriptions" }));

describe("Money coming in", { timeout: 20_000 }, () => {
  it("a weekly Saturday shift lifts the hero from £5.42 to £14.04 a day", async () => {
    renderPage();
    await screen.findByText("safe to spend until Mon 11 Jan");
    expect(safeNumber()).toBe("£5.42");
    expect(
      moneyIn().getByText(
        "Part-time shifts, paydays, birthday money: add it and your runway updates.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(moneyIn().getByRole("button", { name: "Saturday shift · £60 weekly" }));

    expect(safeNumber()).toBe("£14.04");
    expect(
      screen.getByText("At your usual £6.50 a day, you'll reach loan day with £424.00 to spare."),
    ).toBeInTheDocument();
    expect(moneyIn().getByText("£60.00 every week from Sat 21 Nov")).toBeInTheDocument();
    expect(moneyIn().getByText("+£480.00 before loan day")).toBeInTheDocument();
    expect(moneyIn().getByText(/your own estimate/)).toBeInTheDocument();

    fireEvent.click(moneyIn().getByRole("button", { name: "Remove Saturday shift" }));
    expect(safeNumber()).toBe("£5.42");
    expect(moneyIn().queryByText("+£480.00 before loan day")).not.toBeInTheDocument();
  });

  it("one-off money: the form adds it on its date (R13)", async () => {
    renderPage();
    await screen.findByText("safe to spend until Mon 11 Jan");
    fireEvent.click(moneyIn().getByRole("button", { name: "One-off money" }));
    const form = within(screen.getByRole("form", { name: "Add money coming in" }));
    expect(form.getByLabelText("How often")).toHaveValue("once");
    expect(form.getByLabelText("What")).toHaveFocus();

    fireEvent.click(form.getByRole("button", { name: /Add money in/ }));
    expect(form.getByText("Say what it is.")).toBeInTheDocument();
    expect(form.getByText("Enter how much it is.")).toBeInTheDocument();

    fireEvent.change(form.getByLabelText("What"), { target: { value: "Birthday money" } });
    fireEvent.change(form.getByLabelText("How much (£)"), { target: { value: "50" } });
    fireEvent.change(form.getByLabelText("Date"), { target: { value: "2026-12-01" } });
    fireEvent.click(form.getByRole("button", { name: /Add money in/ }));

    expect(screen.queryByRole("form", { name: "Add money coming in" })).not.toBeInTheDocument();
    expect(moneyIn().getByText("£50.00 on Tue 1 Dec")).toBeInTheDocument();
    expect(moneyIn().getByText("+£50.00 before loan day")).toBeInTheDocument();
    expect(safeNumber()).toBe("£6.38");
  });

  it("money after loan day is listed but not counted", async () => {
    renderPage();
    await screen.findByText("safe to spend until Mon 11 Jan");
    fireEvent.click(moneyIn().getByRole("button", { name: "One-off money" }));
    const form = within(screen.getByRole("form", { name: "Add money coming in" }));
    fireEvent.change(form.getByLabelText("What"), { target: { value: "Prize" } });
    fireEvent.change(form.getByLabelText("How much (£)"), { target: { value: "200" } });
    fireEvent.change(form.getByLabelText("Date"), { target: { value: "2027-01-11" } });
    fireEvent.click(form.getByRole("button", { name: /Add money in/ }));
    expect(moneyIn().getByText(/after loan day, not counted/)).toBeInTheDocument();
    expect(moneyIn().getByText("+£0.00 before loan day")).toBeInTheDocument();
    expect(safeNumber()).toBe("£5.42");
  });
});

describe("Subscriptions", { timeout: 20_000 }, () => {
  it("a quick pick fills the label, focuses the amount and counts each payment as a bill", async () => {
    renderPage();
    await screen.findByText("safe to spend until Mon 11 Jan");
    expect(
      subs().getByText(
        "Monthly stuff that leaves your account. Each one counts as a bill before loan day.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(subs().getByRole("button", { name: "Music streaming" }));
    const form = within(screen.getByRole("form", { name: "Add a subscription" }));
    expect(form.getByLabelText("What")).toHaveValue("Music streaming");
    expect(form.getByLabelText("£ per month")).toHaveFocus();
    expect(form.getByLabelText("Next payment date")).toHaveValue("2026-11-27");
    expect(form.queryByLabelText("How often")).not.toBeInTheDocument();

    fireEvent.change(form.getByLabelText("£ per month"), { target: { value: "10" } });
    fireEvent.click(form.getByRole("button", { name: /Add subscription/ }));

    expect(subs().getByText("£10.00 a month, next Fri 27 Nov")).toBeInTheDocument();
    // 27 Nov and 27 Dec are before loan day (Mon 11 Jan); 27 Jan is not.
    expect(subs().getByText("£10.00 a month · £20.00 before loan day")).toBeInTheDocument();
    expect(safeNumber()).not.toBe("£5.42");
    // The payments show on the calendar like any other bill.
    expect(screen.getByRole("img", { name: /^Fri 27 Nov:.*Music streaming/ })).toBeInTheDocument();

    fireEvent.click(subs().getByRole("button", { name: "Remove Music streaming" }));
    expect(safeNumber()).toBe("£5.42");
  });

  it("Reset demo clears money in and subscriptions", async () => {
    renderPage();
    await screen.findByText("safe to spend until Mon 11 Jan");
    fireEvent.click(moneyIn().getByRole("button", { name: "Saturday shift · £60 weekly" }));
    fireEvent.click(subs().getByRole("button", { name: "Gym" }));
    const form = within(screen.getByRole("form", { name: "Add a subscription" }));
    fireEvent.change(form.getByLabelText("£ per month"), { target: { value: "20" } });
    fireEvent.click(form.getByRole("button", { name: /Add subscription/ }));
    expect(subs().getByText(/a month, next/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Your numbers" }));
    fireEvent.click(screen.getByRole("button", { name: /Reset demo/ }));

    expect(safeNumber()).toBe("£5.42");
    expect(moneyIn().queryByText("£60.00 every week from Sat 21 Nov")).not.toBeInTheDocument();
    expect(subs().queryByText(/a month, next/)).not.toBeInTheDocument();
  });
});
