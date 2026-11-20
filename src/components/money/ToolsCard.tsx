import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function ToolsCard() {
  return (
    <section
      aria-labelledby="tools-heading"
      className="rounded-2xl border-2 border-primary/25 bg-primary/5 p-4 sm:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        More tools
      </p>
      <h2 id="tools-heading" className="mt-1 font-display text-xl font-semibold">
        🏠 Signing for next year&apos;s house?
      </h2>
      <p className="mt-1 text-muted-foreground">
        Dibs splits rooms and rent fairly, so nobody wants to swap and nobody pays more than they
        can afford.
      </p>
      <Link
        to="/dibs"
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 sm:inline-flex sm:w-auto"
      >
        Open Dibs <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </section>
  );
}
