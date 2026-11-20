import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import type { BlogPost } from "@/content/blog";

import { PostMeta } from "./PostMeta";

interface PostCardProps {
  post: BlogPost;
  /** Heading level inside the page outline: 2 on the blog index, 3 under "Keep reading". */
  level?: 2 | 3;
  /** Compact cards drop the summary (used for "Keep reading" lists). */
  compact?: boolean;
}

// The whole card is clickable through a stretched link on the title, so screen readers hear just
// the post title as the link name. The keyboard focus ring sits on the whole card.
export function PostCard({ post, level = 2, compact = false }: PostCardProps) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <article className="group relative flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md has-[a:focus-visible]:border-primary/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background motion-safe:hover:-translate-y-0.5">
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-2xl bg-secondary motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110 ${
          compact ? "h-11 w-11 text-2xl" : "h-14 w-14 text-3xl"
        }`}
      >
        {post.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <Heading
          className={`text-balance font-display font-bold leading-snug tracking-tight ${
            compact ? "text-base" : "text-lg"
          }`}
        >
          <Link
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none"
          >
            {post.title}
          </Link>
        </Heading>
        {compact ? null : (
          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.summary}
          </p>
        )}
        <PostMeta post={post} className="mt-2" />
      </div>
      <ArrowRight
        className="mt-1 h-5 w-5 shrink-0 text-primary motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </article>
  );
}
