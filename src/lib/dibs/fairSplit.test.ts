import { describe, expect, it } from "vitest";

import { runAcceptance } from "./acceptance";
import { solveFairSplit } from "./fairSplit";
import referenceCases from "./reference-cases.json";
import type { SplitInput } from "./types";

interface ReferenceCase {
  input: { rent: number; premiums: number[][]; limits: (number | null)[] };
  expected:
    | {
        feasible: true;
        roomOf: number[];
        pricePence: number[];
        maxSwitchGainPence: number;
        bindingLimits: number[];
      }
    | { feasible: false; shortfall: unknown };
}

describe("fair-split acceptance cases", () => {
  for (const row of runAcceptance()) {
    it(`${row.id}: ${row.description}`, () => {
      expect(row.actual).toBe(row.expected);
      expect(row.pass).toBe(true);
    });
  }
});

describe("fair-split matches the exact-fraction reference", () => {
  const cases = referenceCases as ReferenceCase[];
  it(`agrees on all ${cases.length} random cases`, () => {
    const mismatches: string[] = [];
    cases.forEach((c, idx) => {
      const input: SplitInput = {
        rentPounds: c.input.rent,
        premiums: c.input.premiums,
        limits: c.input.limits,
      };
      const r = solveFairSplit(input);
      const e = c.expected;
      if (e.feasible) {
        if (!r.feasible) {
          mismatches.push(`#${idx}: expected feasible`);
          return;
        }
        if (!r.verified) mismatches.push(`#${idx}: not verified`);
        if (JSON.stringify(r.roomOf) !== JSON.stringify(e.roomOf))
          mismatches.push(
            `#${idx}: roomOf ${JSON.stringify(r.roomOf)} vs ${JSON.stringify(e.roomOf)}`,
          );
        if (JSON.stringify(r.pricePence) !== JSON.stringify(e.pricePence))
          mismatches.push(
            `#${idx}: prices ${JSON.stringify(r.pricePence)} vs ${JSON.stringify(e.pricePence)}`,
          );
        if (r.maxSwitchGainPence !== e.maxSwitchGainPence)
          mismatches.push(`#${idx}: gain ${r.maxSwitchGainPence} vs ${e.maxSwitchGainPence}`);
        if (JSON.stringify(r.bindingLimits) !== JSON.stringify(e.bindingLimits))
          mismatches.push(
            `#${idx}: binding ${JSON.stringify(r.bindingLimits)} vs ${JSON.stringify(e.bindingLimits)}`,
          );
      } else {
        if (r.feasible) {
          mismatches.push(`#${idx}: expected infeasible`);
          return;
        }
        if (JSON.stringify(r.shortfall) !== JSON.stringify(e.shortfall))
          mismatches.push(
            `#${idx}: shortfall ${JSON.stringify(r.shortfall)} vs ${JSON.stringify(e.shortfall)}`,
          );
      }
    });
    expect(mismatches).toEqual([]);
  });

  it("never shows a verified split that breaks a rule", () => {
    for (const c of referenceCases as ReferenceCase[]) {
      const r = solveFairSplit({
        rentPounds: c.input.rent,
        premiums: c.input.premiums,
        limits: c.input.limits,
      });
      if (!r.feasible || !r.verified) continue;
      expect(r.pricePence.reduce((s, p) => s + p, 0)).toBe(c.input.rent * 100);
      expect(r.pricePence.every((p) => p >= 0)).toBe(true);
      expect(r.maxSwitchGainPence).toBeLessThanOrEqual(1);
    }
  });
});
