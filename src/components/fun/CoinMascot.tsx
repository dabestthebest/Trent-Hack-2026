// Penny: Til Loan Day's coin mascot. An original SVG: a chunky gold coin with a face, little arms and
// an embossed "£" on her tummy. Purely decorative (aria-hidden): whatever Penny "says" is real text
// next to her. Gently bobs; reduced motion keeps her still.

import { useId } from "react";

import type { Mood } from "@/lib/fun/tips";

import { FunMotionStyles } from "./motion";

export interface CoinMascotProps {
  mood: Mood;
  /** Width and height in px. Default 72. */
  size?: number | undefined;
  className?: string | undefined;
  /** false turns the idle bob off (e.g. while a parent is already animating her). Default true. */
  animate?: boolean | undefined;
}

const INK = "#3d2606";
const GOLD_EDGE = "#b8770c";
const GOLD_DEEP = "#e2a01c";
const GOLD_MID = "#f6c537";
const GOLD_LIGHT = "#ffe98c";
const ARM = "#c98a12";
const BLUSH = "#ff8f7d";

// "£", borrowed from the Til Loan Day mark so the brand reads the same everywhere.
const POUND_PATH =
  "M19.6 17.2C19.2 15.8 18.1 15.1 16.7 15.1C14.9 15.1 13.8 16.4 13.8 18.2V23.1C13.8 24.5 13.2 25.4 12.2 26.1H20.2M11.9 20.8H17.6";

interface Arms {
  left: string;
  right: string;
  leftHand: [number, number];
  rightHand: [number, number];
  /** Right arm waves. */
  wave?: boolean;
}

const ARMS: Record<Mood, Arms> = {
  happy: {
    left: "M24 68 Q13 74 14 84",
    right: "M96 62 Q108 55 107 43",
    leftHand: [14, 84],
    rightHand: [107, 43],
    wave: true,
  },
  worried: {
    left: "M24 70 Q12 66 17 54",
    right: "M96 70 Q108 66 103 54",
    leftHand: [17, 54],
    rightHand: [103, 54],
  },
  party: {
    left: "M25 58 Q13 47 15 33",
    right: "M95 58 Q107 47 105 33",
    leftHand: [15, 33],
    rightHand: [105, 33],
  },
  chill: {
    left: "M24 68 Q12 72 15 84",
    right: "M96 66 Q109 64 108 52",
    leftHand: [15, 84],
    rightHand: [108, 52],
  },
};

function Eyes({ mood }: { mood: Mood }) {
  if (mood === "party") {
    return (
      <g fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round">
        <path d="M42.5 52 Q47.5 45.5 52.5 52" />
        <path d="M67.5 52 Q72.5 45.5 77.5 52" />
      </g>
    );
  }
  if (mood === "chill") {
    return (
      <g>
        <path d="M52 49.5 Q60 46.5 68 49.5" fill="none" stroke={INK} strokeWidth="2.4" />
        <rect x="37" y="45" width="19" height="12" rx="5" fill={INK} />
        <rect x="64" y="45" width="19" height="12" rx="5" fill={INK} />
        <path
          d="M40.5 48.5 L45.5 48.5 M67.5 48.5 L72.5 48.5"
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="47.5" cy="51" rx="3.8" ry="4.8" fill={INK} />
      <ellipse cx="72.5" cy="51" rx="3.8" ry="4.8" fill={INK} />
      <circle cx="48.9" cy="49.2" r="1.35" fill="#ffffff" />
      <circle cx="73.9" cy="49.2" r="1.35" fill="#ffffff" />
      {mood === "worried" ? (
        <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round">
          <path d="M41 43.5 L52 40.5" />
          <path d="M68 40.5 L79 43.5" />
        </g>
      ) : null}
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case "happy":
      return (
        <path
          d="M51 62 Q60 71 69 62"
          fill="none"
          stroke={INK}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      );
    case "worried":
      return (
        <path
          d="M52.5 67 Q56 63.5 60 66.5 Q64 69.5 67.5 66"
          fill="none"
          stroke={INK}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "party":
      return (
        <g>
          <path d="M49.5 60.5 Q60 76 70.5 60.5 Z" fill="#6e260b" stroke={INK} strokeWidth="2.2" />
          <ellipse cx="60" cy="67.5" rx="5" ry="2.6" fill="#ff8f7d" />
        </g>
      );
    case "chill":
      return (
        <path
          d="M52 64.5 Q61 69 68.5 61.5"
          fill="none"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
      );
  }
}

export function CoinMascot({ mood, size = 72, className, animate = true }: CoinMascotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const faceId = `penny-face-${uid}`;
  const arms = ARMS[mood];
  const bodyMotion = animate ? (mood === "party" ? "tldf-hop" : "tldf-bob") : undefined;

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", width: size, height: size, lineHeight: 0 }}
    >
      {animate ? <FunMotionStyles /> : null}
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id={faceId} cx="38%" cy="30%" r="75%">
            <stop offset="0%" stopColor={GOLD_LIGHT} />
            <stop offset="45%" stopColor={GOLD_MID} />
            <stop offset="100%" stopColor={GOLD_DEEP} />
          </radialGradient>
        </defs>

        <ellipse cx="60" cy="112" rx="25" ry="4" fill="#000000" opacity="0.1" />

        <g className={bodyMotion}>
          {/* Arms sit behind the coin. */}
          <g fill="none" stroke={ARM} strokeWidth="5" strokeLinecap="round">
            <path d={arms.left} />
            <g className={arms.wave && animate ? "tldf-wave" : undefined}>
              <path d={arms.right} />
              <circle
                cx={arms.rightHand[0]}
                cy={arms.rightHand[1]}
                r="5"
                fill={GOLD_MID}
                stroke={GOLD_EDGE}
                strokeWidth="2"
              />
            </g>
          </g>
          <circle
            cx={arms.leftHand[0]}
            cy={arms.leftHand[1]}
            r="5"
            fill={GOLD_MID}
            stroke={GOLD_EDGE}
            strokeWidth="2"
          />

          {/* Coin: thick edge, face, milled rim, shine. */}
          <circle cx="60" cy="64.5" r="38" fill={GOLD_EDGE} />
          <circle cx="60" cy="60" r="38" fill={`url(#${faceId})`} />
          <circle cx="60" cy="60" r="32.5" fill="none" stroke={GOLD_EDGE} strokeOpacity="0.35" />
          <circle
            cx="60"
            cy="60"
            r="34.5"
            fill="none"
            stroke="#fff6cf"
            strokeOpacity="0.7"
            strokeWidth="1.6"
            strokeDasharray="2.2 3.2"
          />
          <ellipse
            cx="42"
            cy="34"
            rx="8"
            ry="3.6"
            fill="#ffffff"
            opacity="0.55"
            transform="rotate(-32 42 34)"
          />

          {mood === "party" ? (
            <g>
              <path d="M47 27 L57 3 L70 25 Z" className="fill-primary" />
              <path
                d="M50.5 19 L64.5 16 M53.5 11.5 L60.5 10"
                stroke="#ffffff"
                strokeOpacity="0.8"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="57" cy="3" r="4" fill={GOLD_LIGHT} stroke={GOLD_EDGE} strokeWidth="1.5" />
            </g>
          ) : null}

          <ellipse cx="38.5" cy="62" rx="5.5" ry="3.2" fill={BLUSH} opacity="0.5" />
          <ellipse cx="81.5" cy="62" rx="5.5" ry="3.2" fill={BLUSH} opacity="0.5" />
          <Eyes mood={mood} />
          <Mouth mood={mood} />

          {/* Embossed £ on her tummy: a light offset under a deeper stroke. */}
          <g
            transform="translate(60 82) scale(1.05) translate(-16 -20.6)"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d={POUND_PATH}
              stroke="#fff6cf"
              strokeOpacity="0.9"
              strokeWidth="2.6"
              transform="translate(0.7 0.9)"
            />
            <path d={POUND_PATH} stroke={GOLD_EDGE} strokeWidth="2.6" />
          </g>

          {mood === "worried" ? (
            <path d="M88 33 Q84 40 88 42.5 Q92 40 88 33 Z" fill="#8fd4ff" stroke="#4a9fd0" />
          ) : null}
          {mood === "party" ? (
            <g>
              <rect
                x="6"
                y="14"
                width="5"
                height="8"
                rx="1.5"
                fill="#57c4a6"
                transform="rotate(-20 8 18)"
              />
              <rect
                x="104"
                y="12"
                width="5"
                height="8"
                rx="1.5"
                fill="#ff8f7d"
                transform="rotate(25 106 16)"
              />
              <circle cx="98" cy="26" r="2.5" fill="#7aa7ff" />
              <circle cx="20" cy="28" r="2.5" fill={GOLD_MID} />
            </g>
          ) : null}
        </g>
      </svg>
    </span>
  );
}
