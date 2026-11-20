import { ArrowUpRight } from "lucide-react";

import { parseInline } from "./inline";

// Sources open in a new tab: the app keeps your numbers in memory only, so leaving the page in the
// same tab would reset them.
const LINK_CLASS =
  "rounded-sm font-semibold text-primary underline decoration-primary/40 decoration-2 underline-offset-[3px] transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Post text with its [label](https://…) links rendered as real external links. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) =>
        part.kind === "text" ? (
          <span key={i}>{part.text}</span>
        ) : (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            {part.label}
            <ArrowUpRight
              className="ml-0.5 inline h-3.5 w-3.5 -translate-y-px align-baseline"
              aria-hidden="true"
            />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ),
      )}
    </>
  );
}
