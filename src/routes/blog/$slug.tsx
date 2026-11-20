import { createFileRoute, notFound } from "@tanstack/react-router";

import { BlogPostNotFound } from "@/components/blog/BlogPostNotFound";
import { BlogPostPage } from "@/components/blog/BlogPostPage";
import { getPost } from "@/content/blog";

const SITE = "Til Loan Day";

export const Route = createFileRoute("/blog/$slug")({
  // Posts are static content, so the lookup is synchronous. An unknown slug throws notFound(), which
  // renders this route's friendly notFoundComponent inside the AppShell (and a 404 on the server).
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (post === undefined) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (post === undefined) {
      return {
        meta: [{ title: `Post not found · ${SITE}` }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${post.title} · ${SITE}`;
    return {
      meta: [
        { title },
        { name: "description", content: post.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: post.summary },
        { property: "og:type", content: "article" },
        { property: "article:published_time", content: post.date },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: post.summary },
      ],
    };
  },
  component: BlogPostRoute,
  notFoundComponent: BlogPostNotFound,
});

function BlogPostRoute() {
  const { post } = Route.useLoaderData();
  return <BlogPostPage post={post} />;
}
