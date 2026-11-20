// Break My Rule: two rules that agree almost everywhere. Find ONE test that splits them, the way a
// good test case pins down a bug. Pure, so every puzzle is easy to check.

export interface RulePuzzle {
  id: string;
  title: string;
  story: string;
  ruleA: string;
  ruleB: string;
  inputLabel: string;
  placeholder: string;
  /** null when the input isn't a valid test for this puzzle. */
  check: (raw: string) => { a: boolean; b: boolean } | null;
  explain: string;
}

function wholeNumber(raw: string): string | null {
  const s = raw.trim();
  return /^\d{1,12}$/.test(s) ? String(Number(s)) : null;
}

function poundsToPence(raw: string): number | null {
  const s = raw.replace(/[£,\s]/g, "");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  return Number(w) * 100 + Number(f.padEnd(2, "0"));
}

export const PUZZLES: readonly RulePuzzle[] = [
  {
    id: "digits",
    title: "The PIN checker",
    story: "A PIN form only accepts some numbers. Two devs disagree about the rule.",
    ruleA: "It must have 3 digits",
    ruleB: "It must have 3 different digits",
    inputLabel: "Your test number",
    placeholder: "123",
    check: (raw) => {
      const n = wholeNumber(raw);
      if (n === null) return null;
      return { a: n.length === 3, b: new Set(n).size === 3 };
    },
    explain: "A 3-digit number with a repeat (like 112) splits them, and so does 1123.",
  },
  {
    id: "delivery",
    title: "Free delivery",
    story: "The checkout says free delivery “from £20”. The code might say “above £20”.",
    ruleA: "Free from £20 (£20 or more)",
    ruleB: "Free above £20 (more than £20)",
    inputLabel: "Basket total (£)",
    placeholder: "19.99",
    check: (raw) => {
      const p = poundsToPence(raw);
      if (p === null) return null;
      return { a: p >= 2000, b: p > 2000 };
    },
    explain: "Only exactly £20.00 splits them. That boundary is the regression test to keep.",
  },
  {
    id: "login",
    title: "The login that fails",
    story: "“Password123” gets rejected. Is it the capital letter, or the length?",
    ruleA: "Rejects passwords with a capital letter",
    ruleB: "Rejects passwords longer than 8 characters",
    inputLabel: "Your test password",
    placeholder: "hunter2",
    check: (raw) => {
      if (raw.length === 0 || raw.length > 40) return null;
      return { a: /[A-Z]/.test(raw), b: raw.length > 8 };
    },
    explain:
      "“Password123” has both, so it can't tell them apart. Try a short one with a capital (Abc) or a long one without (abcdefghij).",
  },
];

export type Outcome = "invalid" | "split" | "same";

export function judge(p: RulePuzzle, raw: string): Outcome {
  const r = p.check(raw);
  if (r === null) return "invalid";
  return r.a === r.b ? "same" : "split";
}
