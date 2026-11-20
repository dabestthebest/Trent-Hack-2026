# Final published smoke

Target: **https://til-loan-day.lovable.app**. Published origin/main observed:
`29a9af0` — Til Loan Day: final features (Penny AI, XP, income, shared bills, blog).

## Run and result

From the repository root, with Node 24.22.2 activated:

```sh
npx --prefix e2e playwright test --config e2e/final-smoke.config.mjs --workers=2
```

```text
Running 16 tests using 2 workers
16 passed (30.7s)
```

All functional, console-error and horizontal-overflow assertions passed.
**Accessibility findings remain:** axe serious/critical counts are recorded,
not used as feature-test pass/fail criteria. See the remediation section below.

| Check | 375×812 | 1280×900 |
| --- | --- | --- |
| Home: £5.42, a day, Penny's tip, Daily quests | [PASS](smoke/01-home-375x812.png) | [PASS](smoke/01-home-1280x900.png) |
| Saturday shift: £14.04 and celebration live region | [PASS](smoke/02-shift-375x812.png) | [PASS](smoke/02-shift-1280x900.png) |
| January rent → overdraft warning → parent → Mum → WhatsApp | [PASS](smoke/03-parent-375x812.png) | [PASS](smoke/03-parent-1280x900.png) |
| Shared bills: 3 expenses, → transfers, WhatsApp | [PASS](smoke/04-bills-375x812.png) | [PASS](smoke/04-bills-1280x900.png) |
| Dibs: Start → Lock in → £95 / £104 / £131 | [PASS](smoke/05-dibs-375x812.png) | [PASS](smoke/05-dibs-1280x900.png) |
| Blog: 3 cards, first post opens | [PASS](smoke/06-blog-375x812.png) | [PASS](smoke/06-blog-1280x900.png) |
| Selftest: 28/28 PASS | [PASS](smoke/07-selftest-375x812.png) | [PASS](smoke/07-selftest-1280x900.png) |
| All visited pages: overflow, console, axe recording | [PASS](smoke/08-page-health-375x812.png) | [PASS](smoke/08-page-health-1280x900.png) |

Every screenshot is full-page. Check 06's screenshot shows the opened first
post. Machine-readable evidence including node selectors, HTML, contrast
measurements and console arrays: [smoke-results.json](../e2e/smoke-results.json).
Exact runner output: [live-run.log](smoke/live-run.log).

## Console errors and horizontal scroll

At **both widths**, console error and uncaught-exception arrays are empty for
every check. All sampled document states satisfy scrollWidth <= clientWidth:
375 <= 375 on mobile and 1280 <= 1280 on desktop. This includes `/`, shift and
parent interaction states, `/dibs`, Dibs reveal, `/dibs?tab=bills`, `/blog`,
`/blog/when-does-my-january-loan-land` and `/selftest`.

## Axe serious / critical rule counts

Counts are violated **rules**, not affected nodes, and are not summed across
repeat scans. Table uses the final scan in each relevant feature check.

| Page / state | 375×812 serious / critical | 1280×900 serious / critical | Rules |
| --- | --- | --- | --- |
| `/` default | 2 / 0 | 2 / 0 | color-contrast; label-content-name-mismatch |
| `/` after Saturday shift | 2 / 0 | 2 / 0 | color-contrast; label-content-name-mismatch |
| `/` after January rent → parent → Mum | 4 / 0 | 4 / 0 | color-contrast; definition-list; dlitem; label-content-name-mismatch |
| `/dibs` initial | 1 / 0 | 1 / 0 | label-content-name-mismatch |
| `/dibs` reveal | 2 / 0 | 2 / 0 | color-contrast; label-content-name-mismatch |
| `/dibs?tab=bills` | 1 / 0 | 1 / 0 | label-content-name-mismatch |
| `/blog` | 1 / 0 | 1 / 0 | label-content-name-mismatch |
| First blog post | 2 / 0 | 2 / 0 | color-contrast; label-content-name-mismatch |
| `/selftest` | 1 / 0 | 1 / 0 | label-content-name-mismatch |

Post contrast detection varied during immediate navigation scans: check 06's
first scan was 1/0, but its final scan was 2/0 at both widths. Check 08 recorded
1/0 mobile and 2/0 desktop for that post. All samples are retained in JSON;
the table does not claim the contrast issue is absent from mobile.

## Selector corrections

The first published run exposed three test-selector mistakes, verified against
live DOM, not app bugs. Corrected only those selectors:

- Saturday shift's briefcase emoji is aria-hidden; its accessible button name
  is exactly `Saturday shift · £60 weekly`.
- Expenses use the named `Shared bills` list, not an `Expenses` region.
- Blog cards contain `h2 > a`; the link does not wrap the heading.

All original amounts, counts, warning copy, navigation, live-region and link
requirements remain asserted. No app files changed. Pre-publication report
and local log were removed; all screenshots/results now describe the final run.

## Suggested app changes for Claude

No functional smoke failures remain. The following are real serious axe
findings, reproduced on live; they were not suppressed or made to fail the
functional tests. Reproduce at either requested width unless noted.

### 1. Global level badge accessible name

1. Open `/` in a fresh browser context.
2. Inspect the header level button (`button[aria-haspopup="dialog"]`) and run axe.
3. Visible text includes `Lv1` / `Lv 1 · 10 XP`; aria-label instead begins
   `Level 1, Fresh Fresher, ...`. Axe reports `label-content-name-mismatch`.

Include the visible label in the accessible name, or use the visible text as
the name and move extra level/quest detail into an accessible description.
This finding appears on every visited route, not just Dibs.

### 2. Dibs reveal room buttons still mismatch after animation

1. Open `/dibs` → Start → Lock in.
2. Wait for all three room cards to finish flipping, then run axe.
3. Inspect `ol[aria-label="Rooms and rents"] button.flip-inner`.

The finding **persists after animation** (confirmed in a supplemental settled
DOM/axe check). Example element:

```html
<button aria-disabled="true"
  aria-label="Box room: You, £95.00 per week. Within limit."
  class="flip-inner ... is-flipped">...</button>
```

Its textContent contains `📦Box room?📦Box roomYYou£95.00per week Within limit`:
both flip faces and decorative initials contribute text not reflected in its
name. Middle room and Big double are also affected. Mark inactive flip faces
and decorative content appropriately hidden from accessibility and ensure
the name contains the remaining visible label. During animation the label is
`Box room: revealing`, which also mismatches the price content already in DOM.

### 3. January rent impact description-list structure

1. Open `/` → January rent (12 weeks upfront).
2. Open Ask a parent to help → Mum; run axe (the impact panel is still visible).
3. Inspect `dl.divide-y`: nested `div > div` wrappers separate `dt`/`dd` from
   valid description-list grouping. Axe reports `definition-list` (one node)
   and `dlitem` (six nodes).

Affected terms: Safe to spend, Overdraft from, Day before loan day; corresponding
change values are `−£5.42 a day`, `3 days sooner`, `−£1140.00`.
Use valid direct dt/dd children or valid single-level grouped div children.

### 4. Home and quest contrast

1. Open `/` in a fresh context; run axe.
2. Inspect `div[role="note"]` → Penny's tip label and unfinished quest XP pills.

Penny's tip is 11px bold `#ba451c` on `#f2e4d1`, **4.24:1**.
Quest XP pills are 12px bold `#ba451c` on `#f5e5d8`, **4.31:1**.
Both require **4.5:1**; darken the foreground or adjust the background.

### 5. Dibs parent-help contrast

1. Open `/dibs` → Start → Lock in; scroll to the deposit/parent-help section.
2. Run axe on the `Ask a parent to help` button's span (`.-mx-2 > span`).

14px text `#ba451c` on `#e4ede3` is **4.42:1**, below 4.5:1.

### 6. First post Quick tip contrast

1. Open `/blog` → When does my January loan actually land?
2. Scroll to Quick tip, let the page settle and run axe.
3. Inspect the `Quick tip` heading and its government-link text.

`#ba451c` on `#f7e9dc` is **4.46:1**, below 4.5:1 for both the 14px bold
heading and the 17px normal link. Adjust foreground/background contrast.
