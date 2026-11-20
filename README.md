Live: https://til-loan-day.lovable.app

# Til Loan Day

**Til Loan Day is for UK students waiting on their next Student Finance payment: it shows what you can safely spend each day, lets you preview a plan before you say yes, and sorts housemate money fairly.**

Built for Hack The Trent 2026 (NTU) with [Lovable](https://lovable.dev). No bank login and no account. Your money numbers aren't saved; only your XP is kept, on your device. Two optional AI features (the invite reader and Penny AI) send text to an AI model, as described below.

## What's in it

### Runway (`/`)

- **Safe to spend per day until loan day.** This is the largest whole-pence daily spend that never takes you below £0, given your dated bills and any expected income.
- **Demo numbers:**
  - Balance £350, arranged overdraft £500, usual spend £6.50 a day.
  - Bills: phone £15 on 5 Dec, train home £38 on 17 Dec, phone £15 on 5 Jan.
  - Loan day is **Mon 11 Jan 2027**, an editable estimate based on NTU's standard Term Two start. Check your Student Finance England account for your own payment date.
  - The app shows **£5.42 a day**: "At your usual £6.50 a day, you'd dip into your overdraft on Mon 4 Jan, 7 days before loan day."
- **Day calendar.** Each day is marked "Your money", "Arranged overdraft" (hatched) or "Overdraft used up" (cross-hatched), in text as well as colour.
- **Can I say yes?** Preview a plan before you commit:
  - Winter ball £55: "You'd hit your overdraft 8 days sooner." Safe to spend drops from £5.42 to £4.36 a day, and the overdraft starts Sun 27 Dec instead of Mon 4 Jan.
  - Christmas meal £28.
  - January rent (12 weeks upfront) £1,140, which uses up the whole overdraft.
  - Ski trip deposit £450.
  - Or something else of your own.
  - Each preview drafts a group-chat reply you can copy or open in WhatsApp.
  - "I'm going" adds the plan to your bills. "Skip it" adds it to a "saved by skipping" jar. Rent and tuition get "Not now" instead, because you still owe them.
- **Paste an invite.** Paste a group-chat message. An AI model reads the cost and date (`src/lib/ai/parse-invite.ts`, through Lovable's AI gateway), and you check the fields before anything runs. If the AI is offline, an on-device parser fills them in (`src/lib/money/invite.ts`).
- **Ask a parent.** For big costs that would hurt your runway, it drafts a polite, editable message for WhatsApp, iMessage/SMS, email, Telegram or your phone's share menu. Nothing is sent until you press send in that app.
- **Money coming in.** Part-time shifts, paydays and one-off money, as your own estimate. A £60 Saturday shift lifts the demo to £14.04 a day, reaching loan day with £424 to spare.
- **Subscriptions.** A monthly list. Each payment counts as a bill before loan day. There's no detection, because there's no bank connection.
- **Penny**, the coin mascot:
  - Penny's tips are worked out from your numbers, e.g. "Spend £1.08 less a day and you'll make it to loan day without touching your overdraft."
  - **Penny AI** reviews the numbers on the page. Only amounts, dates and item names are sent. Any tip quoting a £ figure that isn't in your numbers is dropped (`src/lib/fun/pennyAi.ts`).
- **XP and daily quests.** Check your runway, preview before saying yes, skip something, paste an invite, split rent fairly, draft an ask-a-parent message. There are levels and a small victory animation. XP is stored only in your browser.

### Dibs (`/dibs`)

- **Rooms and rent.** Each housemate secretly says how much more per week they'd pay for each room than the box room, plus an optional weekly limit. Dibs assigns rooms and rents so that:
  - the rents add up exactly to the rent;
  - by each person's own answers, nobody would rather have another room at its price (checked to within 1p);
  - nobody pays more than their limit;
  - among those splits, the least happy person is as happy as possible (maximin).
  - When no split fits, it tells you who is short and by how much.
- **Demo (£330 a week):** you get the Box room at £95, Sam the Middle at £104, Alex the Big double at £131. An equal split would have put Sam £6 over Sam's £104 limit.
- **Signing for this house?** Two options:
  - **Holding deposit.** In England this is capped at one week's rent **per tenancy** (Tenant Fees Act 2019). Your share is your weekly rent, split the Dibs way.
  - **Pay rent upfront.** This includes the Renters' Rights Act 2025 caveat: a landlord can't take rent before signing, and can ask for at most a month in advance. Paying more is your own choice.
  - Either option can be previewed in Til Loan Day.
- **Shared bills** (`/dibs?tab=bills`). Log who paid what, see balances and settle-up transfers, and send the settle-up to the house chat. "Add what you owe to Til Loan Day" puts it on your runway.

### Blog (`/blog`)

Three short posts, each built only from sourced facts in `docs/FACT-CHECK.md`:

- when the January loan lands;
- the holding deposit cap;
- how Dibs splits rent.

### Selftest (`/selftest`)

Runs the engines' acceptance cases in the browser: **28/28**.

## How we know the maths is right

- **The runway engine** (`src/lib/money/runway.ts`) is checked against an exact-arithmetic Python reference on 220 random cases (`src/lib/money/reference-cases.json`), plus 14 acceptance cases.
- **The Dibs engine** (`src/lib/dibs/fairSplit.ts`) is checked against an exact-fraction reference on 240 random cases, plus 14 acceptance cases.
- **Overall:** 270+ unit tests (Vitest), plus end-to-end checks in a real browser at phone and desktop sizes.

## Honesty notes

- Loan day is an estimate. Holding-deposit and advance-rent notes are general information about England, not legal advice.
- Income is your own estimate. Meal-deal conversions use a round £4.
- Fair-rent maths is inspired by Spliddit (Carnegie Mellon University) and _Fair Rent Division on a Budget_ (Procaccia, Velez & Yu, AAAI 2018). Dibs lets each housemate set a weekly rent limit and checks whether a fair split can fit everyone's limit.
- Campus Wi-Fi: once loaded, all the maths runs on your phone, and the other pages are preloaded. When you're offline, the AI features fall back to on-device versions straight away.

## Development

```sh
npm i
npm run dev
npm test
```

Built with TanStack Start, TypeScript, React and Tailwind CSS on Lovable. Fact-check, CI, accessibility audit and pitch materials are in `docs/` and `e2e/` (contributed by Devin).
