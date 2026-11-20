// Splits post text into plain runs and inline links written as [label](https://…).

export type InlinePart =
  { kind: "text"; text: string } | { kind: "link"; label: string; href: string };

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const start = m.index;
    const label = m[1];
    const href = m[2];
    if (label === undefined || href === undefined) continue;
    if (start > last) parts.push({ kind: "text", text: text.slice(last, start) });
    parts.push({ kind: "link", label, href });
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/** The year of an ISO date, for "Fri 20 Nov 2026"-style labels (formatDay has no year). */
export function isoYear(d: string): string {
  return d.slice(0, 4);
}
