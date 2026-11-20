import { QueryClient } from "@tanstack/react-query";
import { createRouter, isNotFound } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { posts } from "@/content/blog";
import { routeTree } from "@/routeTree.gen";
import { Route as PostRoute } from "@/routes/blog/$slug";

// Match only: no loaders run and nothing renders (see src/test/app-routing.test.tsx for why).
describe("blog routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches /blog to the index route", () => {
    expect(router.matchRoutes("/blog").at(-1)?.routeId).toBe("/blog/");
  });

  it("matches /blog/<slug> to the post route", () => {
    for (const p of posts) {
      const leaf = router.matchRoutes(`/blog/${p.slug}`).at(-1);
      expect(leaf?.routeId).toBe("/blog/$slug");
      expect(leaf?.params).toMatchObject({ slug: p.slug });
    }
  });

  it("loads a known post and throws notFound for an unknown slug", () => {
    // Call the loader directly; it only reads params.
    const loader = PostRoute.options.loader as unknown as (ctx: { params: { slug: string } }) => {
      post: { slug: string };
    };
    const first = posts[0];
    if (!first) throw new Error("no posts");
    expect(loader({ params: { slug: first.slug } }).post.slug).toBe(first.slug);
    let thrown: unknown = null;
    try {
      loader({ params: { slug: "definitely-not-a-post" } });
    } catch (e) {
      thrown = e;
    }
    expect(isNotFound(thrown)).toBe(true);
  });
});
