import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackToBlog() {
  return (
    <Link
      to="/blog"
      className="-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to the blog
    </Link>
  );
}
