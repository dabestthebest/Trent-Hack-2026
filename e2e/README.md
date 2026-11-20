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
- The Tab check covers visible, enabled buttons, links and inputs in the initial page state.
  It checks for a changed CSS outline or box shadow; visual review is still needed for
  the indicator's contrast, clipping, and placement.
- The Dibs flow uses Tab and Enter only. Older builds put Dibs at `/`; the flow tries there
  if `/dibs` is a 404, but the `/dibs` audit still reports the missing route. The Runway
  keyboard test skips if the `Can I say yes?` UI has not appeared on that build.
- Look in `test-results/` for the JSON report (including axe and keyboard data), viewport
  screenshots and retained traces. Open a trace with `npx playwright show-trace <trace.zip>`.

See [the audit report](../docs/A11Y-REPORT.md) for the recorded baseline and screenshot evidence.
