import { useEffect, useRef, useState, type RefObject } from "react";

import { prefersReducedMotion } from "./dom";

/**
 * Eases the shown value towards `target` whenever it changes (never on first render, so server and
 * client markup match). Integer in, integer out. Jumps straight there with reduced motion.
 */
export function useAnimatedNumber(target: number, durationMs = 650): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    if (prefersReducedMotion() || typeof window.requestAnimationFrame !== "function") {
      shownRef.current = target;
      setShown(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = t >= 1 ? target : Math.round(from + (target - from) * eased);
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return shown;
}

export interface ValueChange {
  delta: number;
  seq: number;
}

/** The most recent change to `value` (after the first render), cleared after `holdMs`. */
export function useRecentChange(value: number, holdMs = 2600): ValueChange | null {
  const prev = useRef(value);
  const seq = useRef(0);
  const [change, setChange] = useState<ValueChange | null>(null);

  useEffect(() => {
    if (prev.current === value) return;
    const delta = value - prev.current;
    prev.current = value;
    seq.current += 1;
    setChange({ delta, seq: seq.current });
    const t = window.setTimeout(() => setChange(null), holdMs);
    return () => window.clearTimeout(t);
  }, [value, holdMs]);

  return change;
}

/**
 * true for `ms` once `key` has changed to a non-null value AND the element is on screen, so a brief
 * highlight is never spent while the user is looking at something else.
 */
export function useFlashWhenVisible(
  key: string | null,
  ref: RefObject<Element | null>,
  ms = 1800,
): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(false);
    if (key === null) return;
    let timer = 0;
    const fire = () => {
      setOn(true);
      timer = window.setTimeout(() => setOn(false), ms);
    };
    const el = ref.current;
    if (el === null || typeof IntersectionObserver === "undefined") {
      fire();
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fire();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [key, ref, ms]);

  return on;
}
