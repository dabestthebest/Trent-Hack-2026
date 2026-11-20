import { createFileRoute } from "@tanstack/react-router";

import { DibsApp } from "@/components/dibs/DibsApp";

const TITLE = "Dibs: fair rooms and rent | Til Loan Day";
const DESCRIPTION =
  "Dibs splits rooms and rent for student housemates so nobody wants to swap and nobody pays more than they can afford.";

export const Route = createFileRoute("/dibs")({
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
  component: DibsPage,
});

function DibsPage() {
  return <DibsApp />;
}
