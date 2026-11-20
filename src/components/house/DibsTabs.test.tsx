import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MoneyProvider } from "@/lib/money/store";
import { Route as DibsRoute } from "@/routes/dibs";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 20, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

// The real /dibs route (validateSearch + component) under a bare root, so no html shell renders.
async function renderDibsAt(url: string) {
  const rootRoute = createRootRoute();
  // Same wiring as routeTree.gen.ts, which also has to cast here.
  const dibs = DibsRoute.update({
    id: "/dibs",
    path: "/dibs",
    getParentRoute: () => rootRoute,
  } as unknown as Parameters<typeof DibsRoute.update>[0]);
  const router = createRouter({
    routeTree: rootRoute.addChildren([dibs]),
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  await router.load();
  render(
    <MoneyProvider>
      <RouterProvider router={router} />
    </MoneyProvider>,
  );
  return router;
}

describe("/dibs tabs", () => {
  it("opens on Rooms & rent by default", async () => {
    await renderDibsAt("/dibs");
    const rooms = await screen.findByRole("tab", { name: "Rooms & rent" });
    expect(rooms).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Shared bills" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("heading", { name: "Who gets the big room?" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Who owes who?" })).toBeNull();
  });

  it("deep-links to shared bills with ?tab=bills and writes the tab back to the URL", async () => {
    const router = await renderDibsAt("/dibs?tab=bills");
    expect(await screen.findByRole("tab", { name: "Shared bills" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByRole("heading", { name: "Who owes who?" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Who gets the big room?" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Rooms & rent" }));
    await waitFor(() => expect(router.state.location.search).toEqual({ tab: "rooms" }));
    expect(screen.getByRole("heading", { name: "Who gets the big room?" })).toBeVisible();

    // Arrow keys move between the two tabs.
    fireEvent.keyDown(screen.getByRole("tab", { name: "Rooms & rent" }), { key: "ArrowRight" });
    await waitFor(() => expect(router.state.location.search).toEqual({ tab: "bills" }));
    expect(screen.getByRole("tab", { name: "Shared bills" })).toHaveFocus();
  });

  it("ignores an unknown tab value", async () => {
    await renderDibsAt("/dibs?tab=party");
    expect(await screen.findByRole("tab", { name: "Rooms & rent" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
