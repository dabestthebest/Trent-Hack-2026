import { posts } from "@/content/blog";

import { PostCard } from "./PostCard";

/** Newest first; posts with the same date keep their authored order. */
function newestFirst() {
  return posts
    .map((post, i) => ({ post, i }))
    .sort((a, b) => (a.post.date === b.post.date ? a.i - b.i : a.post.date < b.post.date ? 1 : -1))
    .map(({ post }) => post);
}

/** "/blog": the static money blog's post list. Pure render, so it's SSR-safe. */
export function BlogIndexPage() {
  const list = newestFirst();
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-success-strong">
          <span aria-hidden="true">📚</span> The blog
        </p>
        <h1 className="text-balance font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl">
          Money stuff, minus the waffle.
        </h1>
        <p className="text-muted-foreground">
          Quick reads on loan day, holding deposits and fair rent. Every fact is checked and linked,
          so you can see the source yourself.
        </p>
      </header>

      <ul className="space-y-3">
        {list.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-muted-foreground">
        General information, not financial or legal advice. The loan and deposit posts are about
        England.
      </p>
    </div>
  );
}
