// "Ask a parent to help": turns one big bill into a short, polite message and opens it in the app the
// student already uses (WhatsApp, Messages, email, Telegram, or the phone's own share sheet).
// Nothing is ever sent from here: the student picks the app and presses send there.

import {
  Check,
  ChevronDown,
  ClipboardCopy,
  HandHeart,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  Share2,
} from "lucide-react";
import { useEffect, useId, useState, type JSX, type ReactNode } from "react";

import { useFun } from "@/lib/fun/store";
import { askParentMessage, askParentSubject, shareLinks } from "@/lib/money/askParent";
import type { ISODate } from "@/lib/money/types";
import { cn } from "@/lib/utils";

import { copyToClipboard } from "./dom";
import { FOCUS_RING } from "./styles";

export interface AskParentProps {
  bill: { label: string; amountPence: number; date: ISODate };
  impact: string | null;
  loanDate: ISODate | null;
  /** "button": a compact text button that expands the panel inline. "card": starts collapsed inside a bordered card with a heading. */
  variant?: "button" | "card";
  /** Visible text of the toggle. Defaults to "Ask a parent to help". */
  toggleLabel?: string;
  /** Accessible name of the toggle when the visible text needs context (e.g. one per bill in a list). */
  toggleAriaLabel?: string;
  /** A choice rather than a bill: the message says "I'm planning to pay…". */
  optional?: boolean | undefined;
}

export const NAME_MAX = 20;
const NAME_CHIPS = ["Mum", "Dad", "Gran"] as const;

const APP_BUTTON =
  "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2 text-center text-sm font-semibold leading-tight transition hover:bg-secondary/60";

export function AskParent({
  bill,
  impact,
  loanDate,
  variant = "button",
  toggleLabel = "Ask a parent to help",
  toggleAriaLabel,
  optional,
}: AskParentProps): JSX.Element {
  const panelId = useId();
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const { complete } = useFun();

  const toggle = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-label={toggleAriaLabel}
      onClick={() => {
        if (!open) complete("ask-parent");
        setOpen((o) => !o);
      }}
      className={cn(
        variant === "card"
          ? "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 font-semibold text-secondary-foreground hover:brightness-95"
          : "-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary underline-offset-2 hover:underline",
        FOCUS_RING,
      )}
    >
      <HandHeart className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{toggleLabel}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none",
          open && "rotate-180",
        )}
        aria-hidden="true"
      />
    </button>
  );

  const panel = open ? (
    <AskParentPanel
      id={panelId}
      bill={bill}
      impact={impact}
      loanDate={loanDate}
      optional={optional}
      className={
        variant === "card"
          ? "mt-3 border-t border-border pt-3"
          : "mt-1 rounded-2xl border border-border bg-card p-3 shadow-sm"
      }
    />
  ) : null;

  if (variant === "card") {
    return (
      <section
        aria-labelledby={headingId}
        className="rounded-2xl border border-border bg-background/60 p-3"
      >
        <div className="flex items-start gap-2">
          <HandHeart className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <h4 id={headingId} className="font-display text-base font-semibold leading-snug">
              Want a hand with this one?
            </h4>
            <p className="mt-0.5 text-sm text-muted-foreground">
              If a parent or someone else helps with big costs, send them this in the app you
              already use. You choose whether to send it.
            </p>
          </div>
        </div>
        <div className="mt-3">{toggle}</div>
        {panel}
      </section>
    );
  }

  return (
    <div className="min-w-0">
      {toggle}
      {panel}
    </div>
  );
}

interface AskParentPanelProps {
  id: string;
  bill: AskParentProps["bill"];
  impact: string | null;
  loanDate: ISODate | null;
  optional?: boolean | undefined;
  className: string;
}

function AskParentPanel({ id, bill, impact, loanDate, optional, className }: AskParentPanelProps) {
  const messageId = useId();
  const nameId = useId();
  const whoId = useId();
  const sendId = useId();
  // A quick chip ("Mum") or a typed name; picking one clears the other.
  const [chip, setChip] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  /** The student's own wording. null = use the suggested message (which follows the name). */
  const [customText, setCustomText] = useState<string | null>(null);
  // If the bill changes (another option, amount or date), drop any hand-edited text so the message
  // can never quote a stale amount.
  const billKey = `${bill.label}|${bill.amountPence}|${bill.date}`;
  const [seenBill, setSeenBill] = useState(billKey);
  if (seenBill !== billKey) {
    setSeenBill(billKey);
    setCustomText(null);
  }
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  // Browser-only facts, read after mount so server and client render the same markup.
  const [canShare, setCanShare] = useState(false);
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setAppUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (copy !== "copied") return;
    const t = window.setTimeout(() => setCopy("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [copy]);

  const name = chip ?? typed;
  const suggested = askParentMessage({
    name,
    label: bill.label,
    amountPence: bill.amountPence,
    date: bill.date,
    loanDate,
    impact,
    optional,
  });
  const text = customText ?? suggested;
  const links = shareLinks(text, askParentSubject(bill.label), appUrl);

  const onCopy = async () => {
    const ok = await copyToClipboard(text);
    setCopy(ok ? "copied" : "failed");
  };

  const onShare = async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    try {
      await navigator.share({ text });
    } catch {
      // Cancelled, or the share sheet isn't available right now. Nothing to do.
    }
  };

  return (
    <div id={id} role="group" aria-label="Ask a parent" className={cn("space-y-4", className)}>
      <div role="group" aria-labelledby={whoId}>
        <p id={whoId} className="text-sm font-semibold">
          Who&apos;s it for? <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {NAME_CHIPS.map((c) => {
            const active = chip === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setChip(active ? null : c);
                  setTyped("");
                }}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card hover:border-primary/50 hover:bg-secondary/60",
                  FOCUS_RING,
                )}
              >
                {c}
              </button>
            );
          })}
          <label htmlFor={nameId} className="sr-only">
            Or type their name
          </label>
          <input
            id={nameId}
            type="text"
            value={typed}
            maxLength={NAME_MAX}
            autoComplete="off"
            placeholder="Someone else's name"
            onChange={(e) => {
              setTyped(e.target.value.slice(0, NAME_MAX));
              setChip(null);
            }}
            className="h-11 min-w-[9rem] flex-1 basis-36 rounded-full border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      </div>

      <div>
        <label htmlFor={messageId} className="block text-sm font-semibold">
          Your message
        </label>
        <textarea
          id={messageId}
          value={text}
          rows={6}
          onChange={(e) => setCustomText(e.target.value)}
          className="mt-1.5 block w-full min-w-0 resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-base leading-snug text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        {customText !== null && customText !== suggested ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>You&apos;ve edited this, so it won&apos;t change with the name.</span>
            <button
              type="button"
              onClick={() => setCustomText(null)}
              className={cn(
                "-mx-1 inline-flex min-h-11 items-center rounded px-1 font-semibold text-primary underline underline-offset-2",
                FOCUS_RING,
              )}
            >
              Use the suggested message
            </button>
          </p>
        ) : null}
      </div>

      <div>
        <p id={sendId} className="text-sm font-semibold">
          Send it with
        </p>
        <div
          role="group"
          aria-labelledby={sendId}
          className="mt-2 grid grid-cols-2 gap-2 min-[480px]:grid-cols-3"
        >
          <AppLink href={links.whatsapp} newTab icon={<MessageCircle className="h-4 w-4" />}>
            WhatsApp
          </AppLink>
          <AppLink href={links.sms} icon={<MessageSquare className="h-4 w-4" />}>
            iMessage / SMS
          </AppLink>
          <AppLink href={links.email} icon={<Mail className="h-4 w-4" />}>
            Email
          </AppLink>
          <AppLink href={links.telegram} newTab icon={<Send className="h-4 w-4" />}>
            Telegram
          </AppLink>
          {canShare ? (
            <button type="button" onClick={onShare} className={cn(APP_BUTTON, FOCUS_RING)}>
              <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              More apps…
            </button>
          ) : null}
          <button type="button" onClick={onCopy} className={cn(APP_BUTTON, FOCUS_RING)}>
            {copy === "copied" ? (
              <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <ClipboardCopy className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {copy === "copied" ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Nothing is sent until you press send in that app.
        </p>
        {copy === "failed" ? (
          <p className="mt-1 text-sm text-destructive">
            Couldn&apos;t copy automatically. Press and hold the message to copy it.
          </p>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {copy === "copied" ? "Message copied to your clipboard." : ""}
        </p>
      </div>
    </div>
  );
}

function AppLink({
  href,
  newTab = false,
  icon,
  children,
}: {
  href: string;
  newTab?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(APP_BUTTON, FOCUS_RING)}
    >
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
      {children}
      {newTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}
