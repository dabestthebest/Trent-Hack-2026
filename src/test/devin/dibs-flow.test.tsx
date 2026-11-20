import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DibsApp } from "@/components/dibs/DibsApp";
import { MoneyProvider } from "@/lib/money/store";

async function renderDibs() {
  const rootRoute = createRootRoute();
  const dibsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/dibs",
    component: DibsApp,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([dibsRoute]),
    history: createMemoryHistory({ initialEntries: ["/dibs"] }),
  });
  await router.load();
  // Dibs now hands holding deposits to Til Loan Day, so it needs the shared money store.
  render(
    <MoneyProvider>
      <RouterProvider router={router} />
    </MoneyProvider>,
  );
}

function clickButton(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("Dibs flow", () => {
  it("reveals the three default weekly rents and fairness checks", async () => {
    await renderDibs();
    clickButton("Start");
    clickButton("Lock in");

    const rooms = within(screen.getByRole("list", { name: "Rooms and rents" }));
    for (const [room, rent] of [
      ["Box room", "£95.00"],
      ["Middle room", "£104.00"],
      ["Big double", "£131.00"],
    ] as const) {
      const card = await rooms.findByRole("button", { name: new RegExp(`^${room}:.* per week`) });
      expect(within(card).getByText(rent)).toBeVisible();
    }

    const checks = within(screen.getByRole("list", { name: "Checks" }));
    expect(checks.getByText(/Rents add up to £330\.00/)).toBeVisible();
    expect(checks.getByText(/Nobody would rather have another room at its price/)).toBeVisible();
    expect(checks.getByText(/Everyone is within their limit/)).toBeVisible();
  });

  it("shows that the player is £11.00 better off staying than taking the Big double", async () => {
    await renderDibs();
    clickButton("Start");
    clickButton("Lock in");

    const double = await screen.findByRole("button", { name: /^Big double:.*tap to compare/i });
    fireEvent.click(double);

    const challenge = within(screen.getByRole("region", { name: "Think you got a bad deal?" }));
    expect(challenge.getByRole("status")).toHaveTextContent("£11.00 better off");
  });

  it("shows that no fair split fits a £60 weekly limit", async () => {
    await renderDibs();
    clickButton("Start");
    fireEvent.change(screen.getByRole("textbox", { name: "Most I can pay" }), {
      target: { value: "60" },
    });
    clickButton("Lock in");

    expect(screen.getByRole("heading", { name: /^No split is fair/ })).toBeVisible();
  });

  it("hides the answers during both handoffs in a three-player game", async () => {
    await renderDibs();
    fireEvent.click(screen.getByRole("radio", { name: /^Pass the phone/ }));
    fireEvent.click(screen.getByRole("radio", { name: "3" }));
    clickButton("Start");

    expect(screen.getByRole("heading", { name: "Player 1's answers" })).toBeVisible();
    for (const nextPlayer of ["Player 2", "Player 3"]) {
      clickButton("Lock in");

      expect(
        screen.getByRole("heading", { name: `Pass the phone to ${nextPlayer}` }),
      ).toBeVisible();
      expect(screen.getByText("Earlier answers are hidden.")).toBeVisible();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Lock in" })).not.toBeInTheDocument();

      clickButton(`I'm ${nextPlayer}, ready`);
      expect(screen.getByRole("heading", { name: `${nextPlayer}'s answers` })).toBeVisible();
    }
  });
});
