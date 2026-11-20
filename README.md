# Dibs

**Dibs splits rooms and rent for student housemates so nobody wants to swap and nobody pays more than they can afford.**

Built for Hack The Trent 2026 (NTU) with [Lovable](https://lovable.dev).

## What it does

Three housemates, three unequal rooms, one weekly rent. Each housemate says how much more per week they would pay for each room than for the Box room, and optionally sets a weekly limit. Dibs then assigns rooms and rents so that:

1. the rents add up exactly to the total rent;
2. by each person's own answers, nobody would rather have another room at its price (envy-free, checked to within 1p);
3. nobody pays more than their weekly limit;
4. among all splits meeting 1–3, the least happy person is as happy as possible (maximin).

If no split can meet everyone's limit, Dibs says so and works out exactly how far short someone is (for example "Alex is 34p a week short").

Free fair-rent tools such as Spliddit (CMU) assign rooms without envy but ignore what people can afford. Dibs adds weekly limits, following _Fair Rent Division on a Budget_ (Procaccia, Velez & Yu, AAAI 2018).

## Demo

- **Play vs bots:** you plus two fictional bot housemates, Sam (limit £104/week) and Alex (no limit).
- **Pass the phone:** 2–3 people answer in secret on one device.
- The reveal shows who gets which room, the weekly rents, three verified badges, a "tap the room you'd take instead" comparison, and a settle-up line for contracts that charge equal shares.
- `/selftest` runs the engine's acceptance cases in the browser.

Everything runs in the browser: no backend, no login, no AI.

## Code

- `src/lib/dibs/fairSplit.ts`: the fair-split engine (pure TypeScript).
- `src/lib/dibs/acceptance.ts`: acceptance cases with expected values computed independently in exact fractions.
- `src/lib/dibs/reference-cases.json`: 240 random cases from an exact-fraction reference implementation, used by `fairSplit.test.ts`.
- `src/components/dibs/`: the screens.

## Development

```sh
npm i
npm run dev
npm test
```

Built with TanStack Start, TypeScript, React and Tailwind CSS.
