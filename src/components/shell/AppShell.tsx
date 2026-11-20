import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LoanDayMark } from "./LoanDayMark";

// Shared chrome for every route: sticky header (wordmark + tab nav), the page column and the footer.
// Purely presentational and SSR-safe: no window/document access.

const TAB_BASE =
  "relative flex h-full min-h-11 min-w-[4.25rem] flex-col items-center justify-center rounded-t-lg px-2.5 text-sm leading-tight transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3.5 after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:bg-primary after:transition-opacity";

// Active state is not colour-only: bold label plus a 3px underline bar. TanStack also sets
// aria-current="page" and data-status="active" on the active link; we pass aria-current explicitly
// so the contract is visible here.
const TAB_ACTIVE = {
  className: "font-bold text-foreground after:opacity-100",
  "aria-current": "page" as const,
};
const TAB_INACTIVE = { className: "font-medium text-muted-foreground after:opacity-0" };

/** Reserves the bold width so the tab doesn't shift when it becomes active. */
function TabLabel({ children }: { children: string }) {
  return (
    <span className="grid">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-bold">
        {children}
      </span>
      <span className="col-start-1 row-start-1 text-center">{children}</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  // The selftest tables need more room than the phone-first column; every other page stays narrow.
  const wide = useRouterState({ select: (s) => s.location.pathname === "/selftest" });
  const column = `mx-auto w-full px-4 ${wide ? "max-w-5xl" : "max-w-xl"}`;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className={`${column} flex min-h-14 items-stretch justify-between gap-3`}>
          <div className="flex min-w-0 flex-col justify-center py-2">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="-mx-1 inline-flex items-center gap-2 self-start rounded-lg px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LoanDayMark className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
              <span className="whitespace-nowrap font-display text-lg font-extrabold leading-none tracking-tight text-primary sm:text-xl">
                til loan day
              </span>
            </Link>
            <p className="mt-0.5 hidden pl-10 text-xs text-muted-foreground sm:block">
              Make your money last till loan day.
            </p>
          </div>

          <nav aria-label="Tools" className="flex shrink-0 items-stretch">
            <ul className="flex items-stretch gap-0.5 pt-1.5">
              <li className="flex">
                <Link
                  to="/"
                  activeOptions={{ exact: true }}
                  className={TAB_BASE}
                  activeProps={TAB_ACTIVE}
                  inactiveProps={TAB_INACTIVE}
                >
                  <TabLabel>Runway</TabLabel>
                  <span className="hidden text-[11px] font-normal text-muted-foreground sm:block">
                    daily spend
                  </span>
                </Link>
              </li>
              <li className="flex">
                <Link
                  to="/dibs"
                  className={TAB_BASE}
                  activeProps={TAB_ACTIVE}
                  inactiveProps={TAB_INACTIVE}
                >
                  <TabLabel>Dibs</TabLabel>
                  <span className="hidden text-[11px] font-normal text-muted-foreground sm:block">
                    rent split
                  </span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className={`${column} flex-1 pb-12 pt-5 focus:outline-none sm:pt-6`}
      >
        {children}
      </main>

      {/* pb-24 keeps Lovable's floating "Edit with Lovable" badge clear of the last controls. */}
      <footer className="border-t border-border/80">
        <div
          className={`${column} space-y-2 pb-24 pt-5 text-xs leading-relaxed text-muted-foreground`}
        >
          <p>
            Built for Hack The Trent 2026 · Runs entirely in your browser: no bank login, nothing
            stored.
          </p>
          <p>
            Dibs&apos; fair rent maths is inspired by Spliddit (Carnegie Mellon University) and
            &ldquo;Fair Rent Division on a Budget&rdquo; (Procaccia, Velez &amp; Yu, AAAI 2018).
            Demo house, housemates and money numbers are fictional.
          </p>
          <p>
            <Link
              to="/selftest"
              className="-mx-1 inline-flex min-h-11 items-center rounded px-1 underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              selftest
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
