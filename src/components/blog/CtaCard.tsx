import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useId } from "react";

import type { BlogCta } from "@/content/blog";

/** The end-of-post nudge back into the app (Runway or Dibs). Styled like Runway's tools card. */
export function CtaCard({ cta }: { cta: BlogCta }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border-2 border-primary/25 bg-primary/5 p-4 sm:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Try it
      </p>
      <h2 id={headingId} className="mt-1 font-display text-xl font-semibold">
        <span aria-hidden="true">{cta.emoji}</span> {cta.heading}
      </h2>
      <p className="mt-1 text-muted-foreground">{cta.text}</p>
      <Link
        to={cta.to}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 sm:inline-flex sm:w-auto"
      >
        {cta.label} <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </section>
  );
}
