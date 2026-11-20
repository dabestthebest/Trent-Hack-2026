// Browser-only helpers. Call these from effects or event handlers, never during render.

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollIntoViewGently(el: Element | null, block: ScrollLogicalPosition): void {
  if (el === null || typeof el.scrollIntoView !== "function") return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block });
}

/** Copy text to the clipboard, falling back to a hidden textarea where the async API is blocked. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
