import { createFileRoute } from "@tanstack/react-router";

import { BlogIndexPage } from "@/components/blog/BlogIndexPage";

const TITLE = "Blog · Til Loan Day";
const DESCRIPTION =
  "Quick, fact-checked money reads for UK students: when your January loan lands, the holding deposit cap, and how Dibs splits rent fairly.";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: BlogIndexPage,
});
