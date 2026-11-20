// Display helpers for Dibs. Money is integer pence.

export function pounds(pence: number): string {
  const sign = pence < 0 ? "−" : "";
  const [whole = "0", frac = "00"] = (Math.abs(pence) / 100).toFixed(2).split(".");
  return `${sign}£${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac}`;
}

/** Whole pounds without pence, e.g. "£25". */
export function wholePounds(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  return `${sign}£${Math.abs(amount)}`;
}

/** "34p" under £1, otherwise "£1.20". */
export function shortMoney(pence: number): string {
  return Math.abs(pence) < 100 ? `${Math.abs(pence)}p` : pounds(Math.abs(pence));
}

/** "+£15.00" / "−£6.00" / "£0.00" for differences. */
export function signedPounds(pence: number): string {
  if (pence === 0) return "£0.00";
  return `${pence > 0 ? "+" : "−"}£${(Math.abs(pence) / 100).toFixed(2)}`;
}

export function mealDeals(pence: number, mealDealPence: number): number {
  return Math.round(pence / mealDealPence);
}

/** "You" stays capitalised as a name; in the middle of a sentence it reads "you". */
export function nameInSentence(name: string, isPlayerOne: boolean): string {
  return isPlayerOne && name === "You" ? "you" : name;
}

export function possessive(name: string, isPlayerOne: boolean): string {
  if (isPlayerOne && name === "You") return "your";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}
