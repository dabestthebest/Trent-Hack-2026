// Status styling shared by the calendar cells and the legend. Never colour alone: overdraft days are
// hatched, used-up days are cross-hatched and carry a ✕, and every cell has a text label.
//
// These are full Tailwind class strings (arbitrary values with explicit `color:` / `image:` types) so
// Tailwind's scanner sees them. Append them after cn(...) rather than passing them through it.

import type { DayStatus } from "@/lib/money/types";

export const STATUS_CLASS: Record<DayStatus, string> = {
  own: "bg-success-soft text-success-strong",
  overdraft:
    "bg-[color:oklch(0.92_0.085_85)] bg-[image:repeating-linear-gradient(135deg,oklch(0.68_0.14_68/0.55)_0_2px,transparent_2px_7px)] text-[color:oklch(0.36_0.085_58)]",
  exhausted:
    "bg-[color:oklch(0.89_0.065_25)] bg-[image:repeating-linear-gradient(45deg,oklch(0.52_0.19_27/0.5)_0_1.5px,transparent_1.5px_6px),repeating-linear-gradient(-45deg,oklch(0.52_0.19_27/0.5)_0_1.5px,transparent_1.5px_6px)] text-[color:oklch(0.33_0.13_27)]",
};

/** Flat tints (no hatching) for text boxes that carry the same meaning as a status. */
export const TONE_BOX: Record<DayStatus, string> = {
  own: "bg-success-soft text-success-strong",
  overdraft: "bg-[color:oklch(0.95_0.05_85)] text-[color:oklch(0.36_0.085_58)]",
  exhausted: "bg-warning-soft text-foreground",
};

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
