import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MoneyProvider, useMoney } from "@/lib/money/store";

import { settleMessage, validateDibsSearch } from "./houseData";
import { SharedBills } from "./SharedBills";

// SharedBills only uses <Link>; render it as a plain anchor so no router is needed.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  // Pin "today" to Fri 20 Nov 2026, faking only Date so timers stay real.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 20, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Shows the runway's bills so the test can see what "Add what you owe" did. */
function BillsProbe() {
  const { settings } = useMoney();
  return (
    <output data-testid="runway-bills">
      {settings?.bills.map((b) => `${b.label}|${b.amountPence}|${b.date}`).join("\n")}
    </output>
  );
}

function renderBills() {
  return render(
    <MoneyProvider>
      <BillsProbe />
      <SharedBills />
    </MoneyProvider>,
  );
}

const balanceRows = () =>
  within(screen.getByRole("list", { name: "Balances" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent?.replace(/^[+−=]/, ""));

const transferRows = () =>
  within(screen.getByRole("list", { name: "Settle-up payments" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

function addExpense(what: string, amount: string, payer: string, untick: string[] = []) {
  const form = screen.getByRole("form", { name: "Add a shared bill" });
  const f = within(form);
  fireEvent.change(f.getByLabelText("What was it?"), { target: { value: what } });
  fireEvent.change(f.getByLabelText("Amount"), { target: { value: amount } });
  fireEvent.change(f.getByLabelText("Who paid?"), {
    target: { value: String(["You", "Sam", "Alex"].indexOf(payer)) },
  });
  for (const name of untick) fireEvent.click(f.getByRole("checkbox", { name }));
  fireEvent.click(f.getByRole("button", { name: "Add bill" }));
}

describe("Shared bills", () => {
  it("shows the demo bills, balances and settle-up", async () => {
    renderBills();
    expect(await screen.findByRole("heading", { name: "Who owes who?" })).toBeInTheDocument();

    const bills = within(screen.getByRole("list", { name: "Shared bills" }));
    expect(
      bills.getAllByRole("listitem").map((li) => li.querySelector("span")?.textContent),
    ).toEqual(["🧻 Loo roll + cleaning stuff", "🛒 Big Tesco shop", "📶 Wi-Fi"]);
    expect(bills.getByText("Sam paid · split 3 ways · Wed 18 Nov")).toBeInTheDocument();
    expect(bills.getByText("£42.60")).toBeInTheDocument();
    expect(screen.getByText("£82.05")).toBeInTheDocument();

    expect(balanceRows()).toEqual(["You are owed £2.65", "Sam is owed £15.25", "Alex owes £17.90"]);
    expect(transferRows()).toEqual(["Alex →pays Sam£15.25", "Alex →pays You£2.65"]);

    const chat = screen.getByRole("link", { name: "Send settle-up to the house chat" });
    const href = chat.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    const text = decodeURIComponent(href.slice("https://wa.me/?text=".length));
    expect(text).toBe(
      "🧾 House bills settle-up (3 shared bills, £82.05 total)\nAlex → Sam £15.25\nAlex → me £2.65\nWorked out with Til Loan Day",
    );
    expect(chat).toHaveAttribute("target", "_blank");

    // You are owed money, so there is nothing to add to the runway.
    expect(screen.queryByRole("button", { name: /^Add what you owe/ })).toBeNull();
  });

  it("adds a bill, then puts what you owe on the runway", async () => {
    renderBills();
    await screen.findByRole("heading", { name: "Who owes who?" });

    addExpense("Pizza night", "60", "Sam");
    expect(screen.getByRole("list", { name: "Shared bills" })).toHaveTextContent("Pizza night");
    expect(balanceRows()).toEqual(["You owe £17.35", "Sam is owed £55.25", "Alex owes £37.90"]);
    expect(transferRows()).toEqual(["Alex →pays Sam£37.90", "You →pays Sam£17.35"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Add what you owe (£17.35) to Til Loan Day" }),
    );
    expect(screen.getByText("Added to your runway ✓")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See your safe daily spend/ })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByTestId("runway-bills").textContent).toContain(
      "Pay back housemates|1735|2026-11-23",
    );
    expect(screen.queryByRole("button", { name: /^Add what you owe/ })).toBeNull();
  });

  it("handles a split that leaves someone out, with remainder pennies", async () => {
    renderBills();
    await screen.findByRole("heading", { name: "Who owes who?" });

    // £10.01 paid by Alex for You and Alex only: You get the extra penny (£5.01).
    addExpense("Takeaway", "10.01", "Alex", ["Sam"]);
    const bills = within(screen.getByRole("list", { name: "Shared bills" }));
    expect(bills.getByText(/^Alex paid · split 2 ways \(You, Alex\)/)).toBeInTheDocument();
    expect(balanceRows()).toEqual(["You owe £2.36", "Sam is owed £15.25", "Alex owes £12.89"]);
  });

  it("removes a bill and renames a housemate", async () => {
    renderBills();
    await screen.findByRole("heading", { name: "Who owes who?" });

    fireEvent.click(screen.getByRole("button", { name: "Remove 📶 Wi-Fi" }));
    expect(screen.getByRole("list", { name: "Shared bills" })).not.toHaveTextContent("Wi-Fi");
    expect(balanceRows()).toEqual(["You owe £17.35", "Sam is owed £25.25", "Alex owes £7.90"]);

    fireEvent.change(screen.getByLabelText("Person 2"), { target: { value: "Samira" } });
    expect(balanceRows()[1]).toBe("Samira is owed £25.25");
    expect(screen.getByLabelText("Person 2")).toHaveAttribute("maxLength", "12");
  });

  it("explains what is wrong with the form in text", async () => {
    renderBills();
    await screen.findByRole("heading", { name: "Who owes who?" });

    const form = within(screen.getByRole("form", { name: "Add a shared bill" }));
    for (const name of ["You", "Sam", "Alex"])
      fireEvent.click(form.getByRole("checkbox", { name }));
    fireEvent.click(form.getByRole("button", { name: "Add bill" }));
    expect(form.getByText("Say what it is.")).toBeInTheDocument();
    expect(form.getByText("Enter an amount.")).toBeInTheDocument();
    expect(form.getByText("Tick at least one person.")).toBeInTheDocument();
    expect(form.getByLabelText("What was it?")).toHaveAttribute("aria-invalid", "true");
    expect(
      within(screen.getByRole("list", { name: "Shared bills" })).getAllByRole("listitem"),
    ).toHaveLength(3);
  });
});

describe("house helpers", () => {
  it("validates the /dibs tab search param", () => {
    expect(validateDibsSearch({ tab: "bills" })).toEqual({ tab: "bills" });
    expect(validateDibsSearch({ tab: "rooms" })).toEqual({ tab: "rooms" });
    expect(validateDibsSearch({ tab: "nope" })).toEqual({ tab: "rooms" });
    expect(validateDibsSearch({})).toEqual({ tab: "rooms" });
  });

  it("names a renamed first housemate in the chat message", () => {
    expect(
      settleMessage(["Tong", "Sam", "Alex"], [{ from: 0, to: 1, amountPence: 500 }], 1, 1500),
    ).toBe(
      "🧾 House bills settle-up (1 shared bill, £15.00 total)\nTong → Sam £5.00\nWorked out with Til Loan Day",
    );
  });
});
