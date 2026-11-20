# Accessibility and mobile audit

**20 November 2026 · Chromium · 375 × 812 and 1280 × 900**

Audited the [published app](https://dibs-fair-rooms.lovable.app) and local Vite at
`http://localhost:8080` on `521a6ea`. Both builds still served Dibs at `/`; `/dibs` returned
the 404 page, and there was no Runway UI to exercise. This is a baseline for those builds,
not an audit of the upcoming Til Loan Day screens.

| Target    | Passed | Failed | Skipped |
| --------- | -----: | -----: | ------: |
| Published |      6 |      2 |       2 |
| Local     |      6 |      2 |       2 |

On each target, the two failures were the `/dibs` route checks (HTTP 404 and a matching
browser console resource error). The two skips were Runway, one per viewport. On the legacy
home route, Tab and Enter completed Start → Lock in → three revealed rents (£95.00, £104.00,
£131.00) → Edit answers at both sizes on both targets.

## Route measurements

Axe counts are **rule counts per scan**, not counts of elements. Both viewports and targets
had the same counts. Each scanned document fit the viewport (375/375 and 1280/1280 CSS px
for scroll width/inner width). Every visible enabled control inventoried on the initial
screens was reached by Tab and had a computed focus outline or changed box shadow. This
does not measure focus-indicator contrast or clipping. No browser errors were recorded on
`/` or `/selftest`.

| Page                             | HTTP | Critical | Serious | Moderate | Minor | Initial tab stops checked, published / local (each viewport) |
| -------------------------------- | ---: | -------: | ------: | -------: | ----: | -----------------------------------------------------------: |
| `/` (legacy Dibs)                |  200 |        0 |       1 |        0 |     0 |                                                        7 / 5 |
| `/dibs` (404 template, not Dibs) |  404 |        0 |       1 |        2 |     0 |                                                        3 / 1 |
| `/selftest`                      |  200 |        0 |       0 |        2 |     0 |                                                        3 / 1 |

## Suggested app changes for Claude

| Page              | Element                         | Impact                                                                                                    | WCAG rule                                        | Suggested fix with file path                                                                                                                                         |
| ----------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dibs`           | Route                           | **Blocked:** direct links reach a 404 on both builds; the Dibs audit cannot cover the new route yet.      | Not a WCAG finding (route availability)          | Add the Dibs route in `src/routes/dibs.tsx` when moving Runway into `src/routes/index.tsx`; verify the published URL directly.                                       |
| `/` (legacy Dibs) | Start button                    | **Serious** (`color-contrast`): 4.44:1, below axe's 4.5:1 threshold for the rendered text.                | 1.4.3 Contrast (Minimum), AA                     | Adjust the primary/foreground color pair in `src/styles.css` for the Start button in `src/components/dibs/HouseScreen.tsx`; recheck normal, hover, and focus states. |
| `/dibs` (404)     | Go home link                    | **Serious** (`color-contrast`): 4.44:1, below 4.5:1.                                                      | 1.4.3 Contrast (Minimum), AA                     | Use the corrected color pair from `src/styles.css` on the recovery link in `src/routes/__root.tsx`.                                                                  |
| `/selftest`       | Results and heading             | **Moderate** (`landmark-one-main`, `region`): no main landmark for assistive-technology users to jump to. | Axe best practice; not a standalone WCAG failure | Wrap the heading, summary and results table in `<main>` in `src/routes/selftest.tsx`.                                                                                |
| `/dibs` (404)     | Error content and recovery link | **Moderate** (`landmark-one-main`, `region`): recovery content has no main landmark.                      | Axe best practice; not a standalone WCAG failure | Use `<main>` as the 404 content wrapper in `NotFoundComponent` in `src/routes/__root.tsx`.                                                                           |

**Cold-load observation:** Initial keyboard runs on both targets reached Start, but the
first Enter sometimes did nothing while the client route script was still loading. The
flow checks now wait for client assets to settle and pass. In `src/components/dibs/HouseScreen.tsx`,
consider exposing Start as enabled only once its handler is ready, with a clear loading state.

## Screenshots and scope

Published app at 375 × 812: [Start and its contrast](a11y-screens/published-start-mobile.jpg),
[`/dibs` returning 404](a11y-screens/published-dibs-404-mobile.jpg),
[`/selftest` results](a11y-screens/published-selftest-mobile.jpg), and
[the Dibs reveal reached by keyboard](a11y-screens/published-reveal-mobile.jpg).

The audit did not exercise screen readers, native mobile browsers, the Dibs pass-the-phone
or challenge flows, or Runway. Axe scans the initial route, not every state in each flow.
See [the suite README](../e2e/README.md) for commands and full JSON results.
