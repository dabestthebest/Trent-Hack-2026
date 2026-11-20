import { Clock } from "lucide-react";

import type { BlogPost } from "@/content/blog";
import { formatDay } from "@/lib/money/dates";

/** "Fri 20 Nov · 2 min read" */
export function PostMeta({ post, className = "" }: { post: BlogPost; className?: string }) {
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground ${className}`}
    >
      <time dateTime={post.date}>{formatDay(post.date)}</time>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {post.readMins} min read
      </span>
    </p>
  );
}
