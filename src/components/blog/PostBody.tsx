import type { Block } from "@/content/blog";

import { RichText } from "./RichText";

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return (
        <p>
          <RichText text={block.text} />
        </p>
      );
    case "h2":
      return (
        <h2 className="mt-9 text-balance font-display text-2xl font-bold leading-tight tracking-tight">
          <RichText text={block.text} />
        </h2>
      );
    case "tip":
      return (
        <aside
          aria-label="Quick tip"
          className="my-6 rounded-2xl border-2 border-primary/25 bg-primary/5 p-4"
        >
          <p className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-primary">
            <span aria-hidden="true">💡</span> Quick tip
          </p>
          <p className="mt-1.5">
            <RichText text={block.text} />
          </p>
        </aside>
      );
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-5 marker:text-primary">
          {block.items.map((item, i) => (
            <li key={i} className="pl-1">
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
  }
}

/** A post's body blocks with comfy reading typography (the page column keeps lines ~70ch). */
export function PostBody({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div className="space-y-4 text-base leading-7 text-foreground/90 sm:text-[1.0625rem] sm:leading-8">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
