# Til Loan Day browser checks

Requires Node 22.12+ and Chromium. Install dependencies only in this folder.

```sh
cd e2e
npm ci
npx playwright install chromium
npm test
```

The default target is [the published app](https://dibs-fair-rooms.lovable.app).
To test a local build, run `bun install && bun run dev` from the repo root in another terminal,
then run `BASE_URL=http://localhost:8080 npm test` from this folder. Use the port Vite prints if it differs.

- Chromium runs each test at 375 × 812 and 1280 × 900.
- Each route audit records all axe violation rules and affected nodes by impact. Axe is an
  inventory, not a zero-violations gate. Non-OK routes, horizontal page scroll, browser
  console errors and uncaught exceptions, and failed keyboard checks fail the route audit.
- The Tab check covers visible, enabled buttons, links, inputs, textareas, selects and
  disclosure summaries in the initial page state.
  It checks for a changed CSS outline or box shadow; visual review is still needed for
  the indicator's contrast, clipping, and placement.
- Keyboard flows use Tab and Enter/Space only: Runway chip → preview → Skip it,
  example invite → Read it → confirm → preview (AI or on-device fallback within 12s),
  and Dibs Start → Lock in → reveal → £95 holding-deposit preview on Runway.
  Dibs handles additional housemates' ready/Lock in screens if required by the default flow.
  There are no legacy-route fallbacks or missing-feature skips. The `/selftest` audit
  requires `data-testid="selftest-total"` to read `25/25 PASS`.
- Look in `test-results/` for the JSON report (including axe and keyboard data), viewport
  screenshots and retained traces. Open a trace with `npx playwright show-trace <trace.zip>`.

See [the audit report](../docs/A11Y-REPORT.md) for the rebuilt-app findings and screenshot evidence,
and [the raw inventory](../docs/A11Y-V2-RAW.json) for node counts, selectors and semantic checks.

## Wait for the rebuild

From this folder, wait for the published HTML title to contain `Til Loan Day`, then run:

```sh
node wait-for-publish.mjs https://dibs-fair-rooms.lovable.app 600
npx playwright test --list
npm test
```

Arguments are URL and timeout in seconds (defaults: `BASE_URL` or the published URL,
and 300 seconds). Non-OK responses, missing titles and connection errors are retried;
timeout or invalid arguments exit nonzero. A matching title is a readiness hint, not
proof that every route or asset has deployed; the tests make those checks.
