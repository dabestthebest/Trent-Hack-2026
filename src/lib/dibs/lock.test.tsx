import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { setDibsLock, useDibsLock } from "./lock";

function Probe() {
  return <p>{useDibsLock() ? "locked" : "open"}</p>;
}

describe("Dibs lock", () => {
  it("re-renders listeners when Dibs locks and unlocks the runway", () => {
    render(<Probe />);
    expect(screen.getByText("open")).toBeInTheDocument();
    act(() => setDibsLock(true));
    expect(screen.getByText("locked")).toBeInTheDocument();
    act(() => setDibsLock(false));
    expect(screen.getByText("open")).toBeInTheDocument();
  });
});
