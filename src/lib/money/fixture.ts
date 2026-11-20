// Demo data for Til Loan Day. Everything is relative to today, so the demo reads the same on any day.
// On Fri 20 Nov 2026 it gives: loan day Mon 11 Jan 2027 (52 days), bills on 5 Dec, 17 Dec and 5 Jan.

import { addDays } from "./dates";
import type { Bill, ISODate, Plan } from "./types";

export const DEMO_BALANCE_PENCE = 35000;
export const DEMO_OVERDRAFT_PENCE = 50000;
export const DEMO_DAILY_SPEND_PENCE = 650;
/** NTU's standard undergraduate Term Two start for 2026/27, when the January Maintenance Loan
 *  instalment is normally paid (see docs/FACT-CHECK.md). An editable estimate, not a promised date. */
export const NTU_TERM_TWO_START = "2027-01-11";
/** Fallback gap once that date has passed. */
export const DEMO_DAYS_TO_LOAN = 52;

export function demoLoanDate(today: ISODate): ISODate {
  return today < NTU_TERM_TWO_START ? NTU_TERM_TWO_START : addDays(today, DEMO_DAYS_TO_LOAN);
}

export function demoBills(today: ISODate): Bill[] {
  return [
    { id: "phone-dec", label: "Phone bill", amountPence: 1500, date: addDays(today, 15) },
    { id: "train-home", label: "Train home", amountPence: 3800, date: addDays(today, 27) },
    { id: "phone-jan", label: "Phone bill", amountPence: 1500, date: addDays(today, 46) },
  ];
}

/** "Can I say yes?" quick picks. */
export function demoPlans(today: ISODate): (Plan & { emoji: string })[] {
  return [
    { emoji: "💃", label: "Winter ball", amountPence: 5500, date: addDays(today, 14) },
    { emoji: "🎄", label: "Christmas meal", amountPence: 2800, date: addDays(today, 20) },
    // Some students pay a term's rent upfront in one go; a parent often helps with it.
    {
      emoji: "🏠",
      label: "January rent (12 weeks upfront)",
      amountPence: 114000,
      date: addDays(today, 42),
    },
    { emoji: "🎿", label: "Ski trip deposit", amountPence: 45000, date: addDays(today, 22) },
  ];
}

/** Days until a holding deposit is usually due after agreeing a house (used by the Dibs link). */
export const HOLDING_DEPOSIT_DAYS_AHEAD = 7;
