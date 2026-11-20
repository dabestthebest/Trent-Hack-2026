import { createFileRoute } from "@tanstack/react-router";

import { RunwayPage } from "@/components/money/RunwayPage";

const TITLE = "Til Loan Day: make your money last till loan day";
const DESCRIPTION =
  "Til Loan Day is for UK students waiting on their next Student Finance payment: it shows what you can safely spend each day, lets you preview a plan before you say yes, and splits rent fairly with housemates.";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
// No header or footer here: the AppShell in __root wraps every route.
export const Route = createFileRoute("/")({
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
  component: RunwayPage,
});
