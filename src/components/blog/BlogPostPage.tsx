import { posts, type BlogPost } from "@/content/blog";
import { formatDay } from "@/lib/money/dates";

import { BackToBlog } from "./BackToBlog";
import { CtaCard } from "./CtaCard";
import { isoYear } from "./inline";
import { PostBody } from "./PostBody";
import { PostCard } from "./PostCard";
import { PostMeta } from "./PostMeta";

/** "/blog/$slug": one post. Pure render, so it's SSR-safe. */
export function BlogPostPage({ post }: { post: BlogPost }) {
  const others = posts.filter((p) => p.slug !== post.slug);
  return (
    <div className="space-y-8">
      <article className="space-y-6">
        <div className="space-y-3">
          <BackToBlog />
          <header className="space-y-3">
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-4xl shadow-sm motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-300"
            >
              {post.emoji}
            </span>
            <h1 className="text-balance font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <PostMeta post={post} />
          </header>
        </div>

        <div className="rounded-2xl bg-secondary/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            TL;DR
          </p>
          <p className="mt-1 font-medium leading-relaxed">{post.summary}</p>
        </div>

        <PostBody blocks={post.body} />

        <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          Facts checked on {formatDay(post.checked)} {isoYear(post.checked)} against the sources
          linked above. General information, not financial or legal advice.
        </p>

        <CtaCard cta={post.cta} />
      </article>

      {others.length > 0 ? (
        <section aria-labelledby="keep-reading" className="space-y-3">
          <h2 id="keep-reading" className="font-display text-xl font-bold tracking-tight">
            Keep reading <span aria-hidden="true">👀</span>
          </h2>
          <ul className="space-y-3">
            {others.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} level={3} compact />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <BackToBlog />
    </div>
  );
}
