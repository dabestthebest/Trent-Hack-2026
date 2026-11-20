# Final feature smoke

From the repository root (Node 22.12+):

```sh
npm ci --prefix e2e
npx --prefix e2e playwright test --config e2e/final-smoke.config.mjs --workers=2
node e2e/wait-for-final.mjs
```

`BASE_URL` defaults to `https://til-loan-day.lovable.app`; `CHROME_PATH` overrides
the installed `/opt/.devin/chrome/chrome/linux-*/chrome-linux64/chrome` binary.
The final-smoke config reuses the two viewport projects from the existing config.
Use this config to enable the machine-readable reporter; results overwrite
`e2e/smoke-results.json`, screenshots overwrite `docs/smoke/<check>-<viewport>.png`.
Each result includes pass/fail, failure messages, page text evidence, console
errors and per-visited-state axe serious/critical rule counts (not node counts).
Axe findings are recorded, not asserted; overflow and console errors fail tests.
Check 08 audits every route and the first post, when that post exists.

The waiter checks origin/main subjects and renders live /selftest every 60 seconds
until both conditions are true. It has no deadline; interrupt to cancel.
It fetches git refs but never changes the current branch or working tree.

Selectors match the published UI: the Saturday shift emoji is aria-hidden,
expenses are in the named Shared bills list, and post links are inside card
headings. The checked-in results JSON is retained as evidence for
`docs/FINAL-SMOKE.md`; subsequent runs replace it.
