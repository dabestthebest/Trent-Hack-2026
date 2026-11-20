import { createFileRoute } from "@tanstack/react-router";

import { DibsApp } from "@/components/dibs/DibsApp";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dibs: fair rooms, rents you can afford" },
      {
        name: "description",
        content:
          "Dibs splits rooms and rent for student housemates so nobody wants to swap and nobody pays more than they can afford.",
      },
      { property: "og:title", content: "Dibs: fair rooms, rents you can afford" },
      {
        property: "og:description",
        content:
          "Dibs splits rooms and rent for student housemates so nobody wants to swap and nobody pays more than they can afford.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <DibsApp />;
}
