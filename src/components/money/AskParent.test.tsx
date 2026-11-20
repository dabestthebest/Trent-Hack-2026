import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AskParent } from "./AskParent";

const BILL = { label: "Tuition fee instalment", amountPence: 92500, date: "2027-01-04" };

function renderAsk(variant: "button" | "card" = "button") {
  return render(
    <AskParent
      bill={BILL}
      impact="push me into my overdraft"
      loanDate="2027-01-11"
      variant={variant}
    />,
  );
}

function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: "Ask a parent to help" }));
  return screen.getByRole("group", { name: "Ask a parent" });
}

const message = (panel: HTMLElement) =>
  (within(panel).getByLabelText("Your message") as HTMLTextAreaElement).value;

afterEach(() => {
  // Remove any share sheet a test added.
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(document, "execCommand");
});

describe("AskParent", () => {
  it("starts collapsed and expands inline", () => {
    renderAsk();
    const toggle = screen.getByRole("button", { name: "Ask a parent to help" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Your message")).not.toBeInTheDocument();

    const panel = openPanel();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", panel.id);
    expect(message(panel)).toBe(
      "Hi! I've got a big bill coming up: Tuition fee instalment, £925.00, due Mon 4 Jan. I'm not expecting my next student loan payment until Mon 11 Jan, and paying it from my own money would push me into my overdraft. Could you help with some or all of it? I can show you the numbers. Thank you 💛",
    );

    fireEvent.click(toggle);
    expect(screen.queryByRole("group", { name: "Ask a parent" })).not.toBeInTheDocument();
  });

  it("the card variant has its own heading", () => {
    renderAsk("card");
    expect(screen.getByRole("heading", { name: "Want a hand with this one?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask a parent to help" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("follows the name until the student edits the message", () => {
    renderAsk();
    const panel = openPanel();

    fireEvent.click(within(panel).getByRole("button", { name: "Dad" }));
    expect(message(panel)).toMatch(/^Hi Dad! I've got a big bill/);
    // Tapping the same chip again goes back to a plain greeting.
    fireEvent.click(within(panel).getByRole("button", { name: "Dad" }));
    expect(within(panel).getByRole("button", { name: "Dad" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(message(panel)).toMatch(/^Hi! /);

    const typed = within(panel).getByLabelText("Or type their name");
    fireEvent.change(typed, { target: { value: "Auntie Sam" } });
    expect(message(panel)).toMatch(/^Hi Auntie Sam! /);
    fireEvent.click(within(panel).getByRole("button", { name: "Gran" }));
    expect(typed).toHaveValue("");
    expect(message(panel)).toMatch(/^Hi Gran! /);

    fireEvent.change(within(panel).getByLabelText("Your message"), {
      target: { value: "Gran, could you help with my fees? x" },
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Mum" }));
    expect(message(panel)).toBe("Gran, could you help with my fees? x");
    expect(
      within(panel)
        .getByRole("link", { name: /WhatsApp/ })
        .getAttribute("href"),
    ).toBe(`https://wa.me/?text=${encodeURIComponent("Gran, could you help with my fees? x")}`);

    fireEvent.click(within(panel).getByRole("button", { name: "Use the suggested message" }));
    expect(message(panel)).toMatch(/^Hi Mum! I've got a big bill/);
  });

  it("keeps a typed name to 20 characters", () => {
    renderAsk();
    const panel = openPanel();
    const typed = within(panel).getByLabelText("Or type their name");
    expect(typed).toHaveAttribute("maxLength", "20");
    fireEvent.change(typed, { target: { value: "A".repeat(30) } });
    expect(typed).toHaveValue("A".repeat(20));
  });

  it("offers the phone's share sheet when there is one", async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderAsk();
    const panel = openPanel();
    const more = await within(panel).findByRole("button", { name: "More apps…" });
    fireEvent.click(more);
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith({ text: message(panel) });
  });

  it("says so when it can't copy", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("blocked")) },
      configurable: true,
    });
    const execCommand = vi.fn(() => false);
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
    renderAsk();
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("button", { name: "Copy" }));
    expect(
      await within(panel).findByText(
        "Couldn't copy automatically. Press and hold the message to copy it.",
      ),
    ).toBeInTheDocument();
  });

  it("links open WhatsApp and Telegram in a new tab, SMS and email in place", () => {
    renderAsk();
    const panel = openPanel();
    for (const name of [/WhatsApp/, /Telegram/]) {
      const link = within(panel).getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
    for (const name of ["iMessage / SMS", "Email"]) {
      expect(within(panel).getByRole("link", { name })).not.toHaveAttribute("target");
    }
  });
});
