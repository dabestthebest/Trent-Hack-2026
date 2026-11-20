// The tiny victory moment: Penny flips in, confetti pops, a toast says what you earned, and it all
// clears itself. Mount once (e.g. in the AppShell, inside <FunProvider>). Decorative layers never take
// clicks (pointer-events: none). Screen readers hear the same words through a polite live region that
// stays mounted. Reduced motion: no flip, no confetti, just the toast.

import { useEffect, useState, type CSSProperties } from "react";

import { useFun } from "@/lib/fun/store";
import { victoryAnnouncement, victoryText } from "@/lib/fun/victory";

import { CoinMascot } from "./CoinMascot";
import { FunMotionStyles } from "./motion";

const QUEST_MS = 1800;
const BIG_MS = 2600;

const COLOURS = ["#f6c537", "var(--primary)", "#57c4a6", "#ff8f7d", "#7aa7ff", "#b98cff"];

// Fixed burst pattern (no Math.random, so server and client agree).
const PIECES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const dist = 58 + (i % 4) * 14;
  return {
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist * 0.8 - 34),
    rot: (i % 2 ? 1 : -1) * (200 + i * 23),
    c: COLOURS[i % COLOURS.length] ?? "#f6c537",
    delay: (i % 5) * 0.03,
  };
});

export function Victory() {
  const { celebration, dismissCelebration } = useFun();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (celebration === null) return;
    setAnnouncement(victoryAnnouncement(celebration));
    const t = window.setTimeout(
      dismissCelebration,
      celebration.kind === "quest" ? QUEST_MS : BIG_MS,
    );
    return () => window.clearTimeout(t);
  }, [celebration, dismissCelebration]);

  const text = celebration ? victoryText(celebration) : null;

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="victory-live">
        {announcement}
      </div>

      {celebration && text ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4"
        >
          <FunMotionStyles />
          <div key={celebration.key} className="relative flex max-w-full flex-col items-center">
            <div className="tldf-motion-only relative" style={{ perspective: "600px" }}>
              <div className="tldf-confetti absolute inset-0">
                {PIECES.map((p, i) => (
                  <span
                    key={i}
                    style={
                      {
                        "--dx": `${p.dx}px`,
                        "--dy": `${p.dy}px`,
                        "--rot": `${p.rot}deg`,
                        "--c": p.c,
                        "--delay": `${p.delay}s`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
              <div className="tldf-flip">
                <CoinMascot mood="party" size={72} animate={false} />
              </div>
            </div>
            <div className="tldf-pop mt-1 max-w-full rounded-2xl bg-foreground px-4 py-2.5 text-center text-background shadow-xl">
              <p className="font-display text-[15px] font-bold leading-snug">{text.main}</p>
              {text.sub ? (
                <p className="mt-0.5 text-xs font-medium opacity-80">{text.sub}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
