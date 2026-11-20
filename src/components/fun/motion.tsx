// Keyframes for the fun layer (Penny's idle bob, the victory coin flip, confetti, toast pop).
// Kept here instead of styles.css. Each component that animates renders <FunMotionStyles />; the
// duplicate <style> tags are identical and harmless. Static string, so server and client markup match.
// Reduced motion switches every animation off and hides the purely decorative bits.

const CSS = `
@keyframes tldf-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes tldf-hop {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(-5deg); }
  50% { transform: translateY(0) rotate(0deg); }
  75% { transform: translateY(-5px) rotate(5deg); }
}
@keyframes tldf-wave { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-14deg); } }
@keyframes tldf-flip {
  0% { transform: translateY(24px) scale(0.4) rotateY(0deg); opacity: 0; }
  20% { opacity: 1; }
  55% { transform: translateY(-14px) scale(1.08) rotateY(540deg); }
  80% { transform: translateY(2px) scale(0.98) rotateY(720deg); }
  100% { transform: translateY(0) scale(1) rotateY(720deg); opacity: 1; }
}
@keyframes tldf-confetti {
  0% { opacity: 0; transform: translate(-50%, 0) scale(0.4) rotate(0deg); }
  10% { opacity: 1; }
  45% { opacity: 1; transform: translate(calc(-50% + var(--dx)), var(--dy)) scale(1) rotate(calc(var(--rot) * 0.6)); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--dx) * 1.3), calc(var(--dy) + 70px)) scale(0.8) rotate(var(--rot)); }
}
@keyframes tldf-pop {
  0% { opacity: 0; transform: translateY(12px) scale(0.92); }
  60% { opacity: 1; transform: translateY(-2px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.tldf-bob { animation: tldf-bob 3.2s ease-in-out infinite; }
.tldf-hop { animation: tldf-hop 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
.tldf-wave { animation: tldf-wave 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 0% 100%; }
.tldf-flip { animation: tldf-flip 0.95s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.tldf-pop { animation: tldf-pop 0.35s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.tldf-confetti > span {
  position: absolute; top: 50%; left: 50%; width: 7px; height: 11px; border-radius: 2px; opacity: 0;
  background-color: var(--c); animation: tldf-confetti 1.3s cubic-bezier(0.2, 0.7, 0.3, 1) var(--delay, 0s) 1 both;
}
.tldf-confetti > span:nth-child(3n) { width: 8px; height: 8px; border-radius: 9999px; }
@media (prefers-reduced-motion: reduce) {
  .tldf-bob, .tldf-hop, .tldf-wave, .tldf-flip, .tldf-pop { animation: none; }
  .tldf-motion-only { display: none; }
}
`;

export function FunMotionStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
