import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { posts } from "@/content/blog";

import { HOUSE_ADS, HouseAd, houseAdFor } from "./HouseAd";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    search,
    children,
    className,
  }: {
    to: string;
    search?: { tab?: string };
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={search?.tab ? `${to}?tab=${search.tab}` : to} className={className}>
      {children}
    </a>
  ),
}));

describe("HouseAd", () => {
  it("is labelled as ad space and links to one of our own tools", () => {
    render(<HouseAd seed="blog-index" />);
    const ad = screen.getByRole("complementary", { name: "Ad space" });
    expect(ad).toHaveTextContent("Ad space · showing our own tools until advertisers join");
    const href = ad.querySelector("a")?.getAttribute("href");
    expect(["/dibs?tab=rooms", "/dibs?tab=bills", "/"]).toContain(href);
  });

  it("picks ads deterministically", () => {
    expect(houseAdFor("x")).toBe(houseAdFor("x"));
    const picked = new Set(posts.map((p) => houseAdFor(p.slug).id));
    expect(picked.size).toBeGreaterThan(0);
    expect(HOUSE_ADS).toHaveLength(3);
  });
});
