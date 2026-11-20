import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addDays } from "@/lib/money/dates";
import { MoneyProvider, useMoney } from "@/lib/money/store";

import { RunwayPage } from "./RunwayPage";

// The page only uses <Link>; render it as a plain anchor so no router is needed.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  // Pin "today" to the spec's demo day (Fri 20 Nov 2026), faking only Date so timers stay real.
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
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function renderPage(extra?: ReactNode) {
  return render(
    <MoneyProvider>
      {extra}
      <RunwayPage />
    </MoneyProvider>,
  );
}

const safeNumber = () => screen.getByTestId("safe-per-day").textContent;

describe("Runway page", () => {
  it("shows the hero, calendar and legend for the demo numbers", async () => {
    renderPage();
    expect(await screen.findByText("safe to spend until Mon 11 Jan")).toBeInTheDocument();
    expect(safeNumber()).toBe("£5.42");
    expect(screen.getByText("a day")).toBeInTheDocument();
    expect(screen.getByText("52 days to loan day")).toBeInTheDocument();
    expect(
      screen.getByText(
        "At your usual £6.50 a day, you'd dip into your overdraft on Mon 4 Jan, 7 days before loan day.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Check your Student Finance England account for your payment date\./),
    ).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Day by day" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Mon 4 Jan: −£2.00, in your overdraft" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Fri 20 Nov: £343\.50, .*Today$/ })).toHaveClass(
      "ring-2",
    );
    expect(screen.getByRole("img", { name: /^Mon 11 Jan: Loan day/ })).toHaveTextContent(
      "Loan day",
    );
    expect(screen.getByText("Your money")).toBeInTheDocument();
    expect(screen.getByText("Arranged overdraft")).toBeInTheDocument();
    expect(screen.getByText("Overdraft used up")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Open Dibs/ })).toHaveAttribute("href", "/dibs");
  });

  it("previews the winter ball, copies the reply, then adds it as a bill", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "💃 Winter ball · £55 · Fri 4 Dec" }),
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "You'd hit your overdraft 8 days sooner." }),
    ).toBeInTheDocument();
    expect(screen.getByText("£5.42 → £4.36 a day")).toBeInTheDocument();
    expect(screen.getByText("Mon 4 Jan → Sun 27 Dec")).toBeInTheDocument();
    expect(screen.getByText("−£56.00 → −£111.00")).toBeInTheDocument();
    expect(screen.getByText("of your £500 overdraft")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "With Winter ball" })).toBeInTheDocument();
    expect(
      screen.getByText("37 days on your own money (was 45) · 15 in your overdraft (was 7)"),
    ).toBeInTheDocument();

    const reply = screen.getByTestId("reply-text").textContent ?? "";
    expect(reply.length).toBeGreaterThan(10);
    fireEvent.click(screen.getByRole("button", { name: "Copy reply" }));
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(reply);
    expect(screen.getByText("Reply copied to your clipboard.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "I'm going" }));
    expect(
      screen.queryByRole("heading", { level: 3, name: "You'd hit your overdraft 8 days sooner." }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(safeNumber()).toBe("£4.36"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Winter ball is in your bills. Safe to spend is now £4.36 a day.",
    );
    expect(screen.getByRole("button", { name: /Winter ball · £55 · Fri 4 Dec/ })).toBeDisabled();
  });

  it("previews January rent paid upfront and drafts a message to Mum", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /^🏠 January rent \(12 weeks upfront\) · / }),
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "This would use up your whole overdraft." }),
    ).toBeInTheDocument();
    expect(screen.getByText("£5.42 → £0.00 a day")).toBeInTheDocument();
    expect(screen.getByText("Mon 4 Jan → Fri 1 Jan")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "Want a hand with this one?" }),
    ).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Ask a parent to help" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: "Ask a parent" })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const panel = screen.getByRole("group", { name: "Ask a parent" });
    fireEvent.click(within(panel).getByRole("button", { name: "Mum" }));
    expect(within(panel).getByRole("button", { name: "Mum" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(panel).getByLabelText("Your message")).toHaveValue(
      "Hi Mum! I've got a big bill coming up: January rent (12 weeks upfront), £1,140.00, due Fri 1 Jan. I'm not expecting my next student loan payment until Mon 11 Jan, and paying it from my own money would use up my whole overdraft. Could you help with some or all of it? I can show you the numbers. Thank you 💛",
    );

    const whatsapp = within(panel).getByRole("link", { name: /WhatsApp/ });
    const href = whatsapp.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(href).toContain("Hi%20Mum!");
    expect(href).toContain("%C2%A31%2C140.00");
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp.getAttribute("rel")).toContain("noopener");
    const sms = within(panel).getByRole("link", { name: "iMessage / SMS" });
    expect(sms.getAttribute("href")).toMatch(/^sms:\?&body=Hi%20Mum!/);
    expect(sms).not.toHaveAttribute("target");
    const email = within(panel).getByRole("link", { name: "Email" });
    expect(email.getAttribute("href")).toMatch(
      /^mailto:\?subject=Could%20you%20help%20with%20January%20rent%20\(12%20weeks%20upfront\)%3F&body=Hi%20Mum!/,
    );
    expect(email).not.toHaveAttribute("target");
    expect(
      within(panel)
        .getByRole("link", { name: /Telegram/ })
        .getAttribute("href"),
    ).toContain(
      `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=Hi%20Mum!`,
    );
    // jsdom has no share sheet, so "More apps…" stays hidden.
    expect(within(panel).queryByRole("button", { name: "More apps…" })).not.toBeInTheDocument();
    expect(
      within(panel).getByText("Nothing is sent until you press send in that app."),
    ).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Copy" }));
    expect(await within(panel).findByRole("button", { name: "Copied!" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^Hi Mum! I've got a big bill/));
    expect(screen.getByText("Message copied to your clipboard.")).toBeInTheDocument();
  });

  it("doesn't offer Ask a parent for a small plan", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "💃 Winter ball · £55 · Fri 4 Dec" }),
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "You'd hit your overdraft 8 days sooner." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask a parent to help" })).not.toBeInTheDocument();
  });

  it("quick-fills a rent bill and offers Ask a parent on big bills", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Your numbers" }));
    // The demo bills are all small.
    expect(screen.queryByRole("button", { name: /^Ask a parent/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tuition fee instalment" }));
    expect(screen.getByLabelText("What")).toHaveValue("Tuition fee instalment");
    expect(screen.getByLabelText("How much")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Rent paid upfront" }));
    expect(screen.getByLabelText("What")).toHaveValue("Rent paid upfront");
    expect(screen.getByLabelText("How much")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("How much"), { target: { value: "1140" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2027-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Add bill" }));
    await waitFor(() => expect(safeNumber()).toBe("£0.00"));

    const ask = screen.getByRole("button", { name: "Ask a parent to help with Rent paid upfront" });
    expect(ask).toHaveTextContent("Ask a parent");
    fireEvent.click(ask);
    const panel = screen.getByRole("group", { name: "Ask a parent" });
    // The impact compares the runway with and without this bill.
    expect(within(panel).getByLabelText("Your message")).toHaveValue(
      "Hi! I've got a big bill coming up: Rent paid upfront, £1,140.00, due Fri 1 Jan. I'm not expecting my next student loan payment until Mon 11 Jan, and paying it from my own money would use up my whole overdraft. Could you help with some or all of it? I can show you the numbers. Thank you 💛",
    );
  });

  it("skipping a plan fills the jar once", async () => {
    renderPage();
    const chip = await screen.findByRole("button", {
      name: "🎄 Christmas meal · £28 · Thu 10 Dec",
    });
    fireEvent.click(chip);
    fireEvent.click(screen.getByRole("button", { name: "Skip it" }));
    expect(screen.getByText("🫙 £28.00 saved by skipping")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Christmas meal · £28/ }));
    expect(screen.getByRole("button", { name: "Already skipped" })).toBeDisabled();
    expect(screen.getByText("🫙 £28.00 saved by skipping")).toBeInTheDocument();
  });

  it("validates a custom plan and previews one after loan day", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "+ Something else" }));
    fireEvent.click(screen.getByRole("button", { name: "See what it does" }));
    expect(screen.getByText("Say what it is.")).toBeInTheDocument();
    expect(screen.getByText("Enter how much it costs.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("What is it?"), { target: { value: "Gig" } });
    fireEvent.change(screen.getByLabelText("How much?"), { target: { value: "6,50" } });
    expect(screen.getByText("Use a dot for pence, like 6.50.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("How much?"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("When?"), { target: { value: "2027-01-20" } });
    fireEvent.click(screen.getByRole("button", { name: "See what it does" }));

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "That's after loan day, so it doesn't change this runway.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Gig · £30 · Wed 20 Jan")).toBeInTheDocument();
  });

  it("edits the numbers live, with inline errors", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Your numbers" }));

    const balance = screen.getByLabelText("Balance now");
    expect(balance).toHaveValue("350.00");
    fireEvent.change(balance, { target: { value: "abc" } });
    expect(screen.getByText("Use numbers only, like 6.50.")).toBeInTheDocument();
    expect(balance).toHaveAttribute("aria-invalid", "true");
    expect(safeNumber()).toBe("£5.42");
    fireEvent.change(balance, { target: { value: "£350" } });
    fireEvent.blur(balance);
    expect(balance).toHaveValue("350.00");

    const spend = screen.getByLabelText("Usual spend per day");
    fireEvent.change(spend, { target: { value: "5.42" } });
    expect(
      screen.getByText("At your usual £5.42 a day, you'll reach loan day with £0.16 to spare."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Spend 50p more a day" }));
    expect(spend).toHaveValue("5.92");

    fireEvent.click(screen.getByRole("button", { name: "Remove Train home on Thu 17 Dec" }));
    expect(screen.queryByRole("button", { name: /Remove Train home/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    expect(screen.getByRole("button", { name: "Remove Train home on Thu 17 Dec" })).toBeVisible();
    expect(screen.getByLabelText("Usual spend per day")).toHaveValue("6.50");
    expect(safeNumber()).toBe("£5.42");
  });

  it("explains a loan date that isn't after today and takes you to fix it", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Your numbers" }));
    fireEvent.change(screen.getByLabelText("Loan day"), { target: { value: "2026-11-20" } });

    expect(
      screen.getByRole("heading", { level: 1, name: "When's your next loan payment?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Loan day needs to be after today.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Can I say yes?" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set the next loan date" }));
    expect(screen.getByLabelText("Loan day")).toHaveFocus();

    fireEvent.change(screen.getByLabelText("Loan day"), { target: { value: "2027-01-11" } });
    expect(safeNumber()).toBe("£5.42");
  });

  it("opens a plan handed over from Dibs once, then clears it", async () => {
    let pendingSeen: unknown = "unset";
    function HandOver() {
      const { today, setPendingPlan, pendingPlan } = useMoney();
      pendingSeen = pendingPlan;
      useEffect(() => {
        if (today) {
          setPendingPlan({
            label: "Holding deposit",
            amountPence: 15000,
            date: addDays(today, 7),
          });
        }
      }, [today, setPendingPlan]);
      return null;
    }
    renderPage(<HandOver />);

    expect(
      await screen.findByRole("heading", { name: "With Holding deposit" }),
    ).toBeInTheDocument();
    const card = screen.getByRole("article");
    expect(within(card).getByText("Holding deposit · £150 · Fri 27 Nov")).toBeInTheDocument();
    await act(async () => {});
    expect(pendingSeen).toBeNull();
  });
});
