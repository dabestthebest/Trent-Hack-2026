import { posts } from "@/content/blog";

import { BackToBlog } from "./BackToBlog";
import { PostCard } from "./PostCard";

/** Shown inside the page (AppShell stays) when "/blog/$slug" doesn't match a post. */
export function BlogPostNotFound() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackToBlog />
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-4xl"
        >
          👻
        </span>
        <h1 className="text-balance font-display text-3xl font-extrabold leading-[1.1] tracking-tight">
          This post ghosted us.
        </h1>
        <p className="text-muted-foreground">
          We couldn&apos;t find that one. The link might have a typo, or the post has moved. These
          ones are definitely here:
        </p>
      </div>
      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}
