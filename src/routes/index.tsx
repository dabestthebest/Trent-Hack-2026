import { createFileRoute, Link } from "@tanstack/react-router";

import { RunwayPage } from "@/components/money/RunwayPage";
import { useDibsLock } from "@/lib/dibs/lock";

const TITLE = "Til Loan Day: make your money last till loan day";
const DESCRIPTION =
  "Til Loan Day is for UK students waiting on their next Student Finance payment: it shows what you can safely spend each day, lets you preview a plan before you say yes, and splits rent fairly with housemates.";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
// No header or footer here: the AppShell in __root wraps every route.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: RunwayRoute,
});

function RunwayRoute() {
  if (useDibsLock()) {
    return (
      <section className="space-y-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-4xl" aria-hidden="true">
          🔒
        </p>
        <h1 className="font-display text-2xl font-bold">Runway locked during Dibs</h1>
        <p className="text-muted-foreground">
          Housemates are passing the phone round, so your balance and bills are hidden.
        </p>
        <Link
          to="/dibs"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          Back to Dibs
        </Link>
      </section>
    );
  }
  return <RunwayPage />;
}
