import { createFileRoute } from "@tanstack/react-router";

import { DibsTabs } from "@/components/house/DibsTabs";
import { validateDibsSearch } from "@/components/house/houseData";

const TITLE = "Dibs: fair rooms and rent | Til Loan Day";
const DESCRIPTION =
  "Dibs splits rooms and rent for student housemates so nobody wants to swap and nobody pays more than they can afford, and its shared bills tab works out who owes who for the big shop and the Wi-Fi.";

export const Route = createFileRoute("/dibs")({
  validateSearch: validateDibsSearch,
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
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <DibsTabs
      tab={tab === "bills" ? "bills" : "rooms"}
      onSelect={(next) => {
        void navigate({ to: "/dibs", search: { tab: next }, replace: true, resetScroll: false });
      }}
    />
  );
}
