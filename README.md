Live: https://til-loan-day.lovable.app

# Til Loan Day

**Til Loan Day is for UK students waiting on their next Student Finance payment: it shows what you can safely spend each day, lets you preview a plan before you say yes, and splits rent fairly with housemates.**

Built for Hack The Trent 2026 with [Lovable](https://lovable.dev). Live demo: <https://dibs-fair-rooms.lovable.app>

Everything runs in your browser. There is no bank login, no backend, no AI, and nothing is stored: refresh and you're back to the demo numbers.

## The three parts

### 1. Runway (`/`)

You enter four numbers: your balance now, your arranged overdraft, what you usually spend a day, and your next loan day. You can also add dated bills (phone, train home, and so on). Til Loan Day then shows:

- **Safe to spend:** the most you can spend every day, in whole pence, without your balance going below £0 on any day before loan day. Bills come out on their dates.
- **The pace line:** at your usual spend, the day you'd dip into your overdraft and how many days before loan day that is. If you'd use up the whole overdraft, it shows that date instead.
- **A day-by-day calendar** from today to loan day. Each day is marked _Your money_, _Arranged overdraft_ or _Overdraft used up_. These use a solid fill, single hatching, and cross-hatching with a ✕, so colour is never the only signal. Every day also has a full text label for screen readers, such as "Sun 10 Jan: −£4.00, in your overdraft".

With the demo numbers (£400 balance, £500 overdraft, £6.50 a day, loan day in 59 days, bills of £15, £38 and £15) the answer is **£5.62 a day**. At £6.50 a day you'd be in your overdraft from Sun 10 Jan, 8 days before loan day.

**How it works.** Spending days run from today to the day before loan day. The end balance on day _k_ is `balance − dailySpend × k − bills paid by day k`. The safe daily figure is `max(0, floor(min over k of (balance − bills paid by day k) / k))`, so it holds on every day, including just after a big bill. Money is always integer pence. Dates are calendar dates worked out as UTC day numbers, so clock changes can never move a day. "Today" is your device's local date.

### 2. "Can I say yes?"

Tap a plan (Winter ball, Christmas meal, Secret Santa, ski trip deposit) or add your own, and see what it does **before** you commit:

- a plain verdict, such as "You'd hit your overdraft 7 days sooner." or "Yes, you can afford it.";
- before → after for safe to spend, the day your overdraft starts, and your balance the day before loan day;
- the calendar redrawn with the plan in it;
- a ready-made reply for the group chat that you can copy;
- **I'm going**, which adds it as a bill, or **Skip it**, which adds it to a jar showing what skipping has saved you.

Example: the £55 Winter ball on Fri 4 Dec takes safe to spend from £5.62 to £4.69 a day, and moves your overdraft from Sun 10 Jan to Sun 3 Jan.

### 3. Dibs: fair rooms and rent (`/dibs`)

Three housemates, three unequal rooms, one weekly rent. Each housemate secretly says how much more a week they'd pay for each room than the Box room, and can set a weekly limit. Dibs then assigns rooms and rents so that:

1. the rents add up exactly to the total rent;
2. by each person's own answers, nobody would rather have another room at its price (envy-free, checked to within 1p);
3. nobody pays more than their weekly limit;
4. among all splits that meet 1–3, the least happy person is as happy as possible (maximin).

If no split can meet everyone's limit, Dibs says so and works out exactly how far short someone is (for example "Alex is 34p a week short"). You can play against two bot housemates or pass the phone around 2–3 people. The reveal has a "tap the room you'd take instead" comparison and a settle-up for contracts that charge everyone the same.

**Dibs → Runway.** After the reveal, "Signing for this house?" takes your share of the holding deposit to the Runway page. In England that deposit is capped at one week's rent. You see a preview of paying it next week before you agree to anything.

## Honesty notes

- **Loan day is a placeholder.** The demo puts it 59 days from today. Real Student Finance payment dates depend on your course and term dates, so check yours and change it under _Your numbers_.
- **No bank connection.** You type your own numbers. Nothing leaves your browser and nothing is saved.
- **It's arithmetic, not advice.** Safe to spend assumes the same spending every day and bills paid on their dates. Real spending is lumpier.
- **Dibs can be gamed.** The split is fair _by the answers people give_. Someone who knows or guesses the others' answers can sometimes shade their own to pay a little less, and no envy-free rent split can rule that out completely. Secret answers make it harder, and public limits stop anyone lowballing their limit, but that's all they do.
- **Holding deposits:** in England the Tenant Fees Act 2019 caps a holding deposit at one week's rent per tenancy (on a joint tenancy, one week's rent for the whole group). Dibs shows your share split the Dibs way, which is your room's weekly rent. This is not legal advice.
- The demo house, housemates and money numbers are fictional.

## Checking the maths

- `/selftest` runs the acceptance cases for both engines in the browser.
- The runway engine is checked against an exact Python reference: 200 random cases in `src/lib/money/reference-cases.json`, plus the hand-checked demo cases (R1–R11).
- The Dibs engine is checked against an exact-fraction reference: 240 random cases in `src/lib/dibs/reference-cases.json`.

## Code map

| Path                    | What it is                                                                      |
| ----------------------- | ------------------------------------------------------------------------------- |
| `src/lib/money/`        | Runway engine (`runway.ts`), dates, demo data, group-chat replies, shared store |
| `src/components/money/` | Runway page: hero, calendar, "Can I say yes?", your numbers                     |
| `src/lib/dibs/`         | Fair-split engine and its reference tests                                       |
| `src/components/dibs/`  | Dibs screens                                                                    |
| `src/components/shell/` | App shell: header, tab nav, footer                                              |
| `src/routes/`           | `/` Runway, `/dibs` Dibs, `/selftest` acceptance checks                         |

Shared state (`MoneyProvider` / `useMoney()` in `src/lib/money/store.tsx`) lives in the root route, so your numbers survive switching between Runway and Dibs. It is never persisted.

## Accessibility

Phone first (360–390px) with 44px touch targets. Everything works from the keyboard, with visible focus rings and a skip link. Status is never shown by colour alone. Live regions announce copy confirmations. Animations (the room-card flip and the reveal confetti) switch off under `prefers-reduced-motion`.

## Credits

- Fair rent division: [Spliddit](https://spliddit.org) (CMU), and _Fair Rent Division on a Budget_ by Procaccia, Velez & Yu (AAAI 2018), which adds budgets to envy-free rent division.
- Holding deposit cap: Tenant Fees Act 2019.
- Fonts: Bricolage Grotesque and Inter (Google Fonts). Icons: Lucide.
- Built with Lovable, TanStack Start, React 19, TypeScript and Tailwind CSS v4.

## Development

```sh
npm i
npm run dev      # local dev server
npm test         # vitest: both engines' reference suites
npm run lint     # eslint + prettier
npm run build    # production build
```
