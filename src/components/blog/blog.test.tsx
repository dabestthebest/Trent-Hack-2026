import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { getPost, postWordCount, posts } from "@/content/blog";
import { isValidISODate } from "@/lib/money/dates";

import { BlogIndexPage } from "./BlogIndexPage";
import { BlogPostNotFound } from "./BlogPostNotFound";
import { BlogPostPage } from "./BlogPostPage";
import { parseInline } from "./inline";

// Render <Link> as a plain anchor (filling in $slug) so no router is needed.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params?: { slug?: string };
    children: ReactNode;
    className?: string;
  }) => (
    <a href={params?.slug ? to.replace("$slug", params.slug) : to} className={className}>
      {children}
    </a>
  ),
}));

const factCheck = readFileSync(path.resolve(__dirname, "../../../docs/FACT-CHECK.md"), "utf8");

function allTexts(slug: string): string[] {
  const post = getPost(slug);
  if (!post) throw new Error(`missing post ${slug}`);
  return post.body.flatMap((b) => (b.type === "list" ? b.items : [b.text]));
}

describe("blog content", () => {
  it("has three posts with unique slugs and valid dates", () => {
    expect(posts).toHaveLength(3);
    expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length);
    for (const p of posts) {
      expect(p.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(isValidISODate(p.date)).toBe(true);
      expect(isValidISODate(p.checked)).toBe(true);
    }
  });

  it("keeps each post 180–300 words with an honest read time", () => {
    for (const p of posts) {
      const words = postWordCount(p);
      expect(words, p.slug).toBeGreaterThanOrEqual(180);
      expect(words, p.slug).toBeLessThanOrEqual(300);
      expect(p.readMins, p.slug).toBe(Math.max(1, Math.ceil(words / 200)));
    }
  });

  it("only links to sources listed in docs/FACT-CHECK.md", () => {
    for (const p of posts) {
      for (const text of allTexts(p.slug)) {
        for (const part of parseInline(text)) {
          if (part.kind === "link") {
            expect(factCheck, `${p.slug}: ${part.href}`).toContain(`(${part.href})`);
          } else {
            // No half-written link syntax left in the prose.
            expect(part.text, p.slug).not.toMatch(/\]\(|\[[^\]]*\]/);
          }
        }
      }
    }
  });

  it("uses the fact-checked dates and rules", () => {
    const loan = allTexts("when-does-my-january-loan-land").join(" ");
    expect(loan).toContain("Monday 11 January to Friday 19 March 2027");
    expect(loan).toContain("Maintenance Loans are paid directly to you at the start of each term.");
    const deposit = allTexts("holding-deposits-one-week-cap").join(" ");
    expect(deposit).toContain("one week's rent per tenancy");
    expect(deposit).toContain("not legal advice");
    // £1,560 a month × 12 ÷ 52 = £360 a week, exactly.
    expect((156000 * 12) / 52).toBe(36000);
    expect(deposit).toContain("£1,560 × 12 ÷ 52 = £360");
    const dibs = allTexts("how-dibs-splits-rent").join(" ");
    expect(dibs).toContain("Procaccia, Velez and Yu");
    expect(dibs).toContain("Carnegie Mellon University");
  });
});

describe("parseInline", () => {
  it("splits text and [label](url) links", () => {
    expect(parseInline("See [GOV.UK](https://www.gov.uk/x) now.")).toEqual([
      { kind: "text", text: "See " },
      { kind: "link", label: "GOV.UK", href: "https://www.gov.uk/x" },
      { kind: "text", text: " now." },
    ]);
    expect(parseInline("plain")).toEqual([{ kind: "text", text: "plain" }]);
    expect(parseInline("[a](http://a.org)")).toEqual([
      { kind: "link", label: "a", href: "http://a.org" },
    ]);
  });
});

describe("blog pages", () => {
  it("lists every post with its date, read time and link", () => {
    render(<BlogIndexPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    const items = screen.getAllByRole("article");
    expect(items).toHaveLength(3);
    for (const p of posts) {
      const link = screen.getByRole("link", { name: p.title });
      expect(link).toHaveAttribute("href", `/blog/${p.slug}`);
    }
    expect(screen.getAllByText("Fri 20 Nov")).toHaveLength(3);
    expect(screen.getAllByText(/2 min read/)).toHaveLength(3);
  });

  it("renders a post with TL;DR, safe external links, a CTA and a way back", () => {
    const post = getPost("when-does-my-january-loan-land");
    if (!post) throw new Error("missing post");
    render(<BlogPostPage post={post} />);
    expect(screen.getByRole("heading", { level: 1, name: post.title })).toBeInTheDocument();
    expect(screen.getByText("TL;DR")).toBeInTheDocument();
    const sfe = screen.getByRole("link", { name: /Student Finance England account/ });
    expect(sfe).toHaveAttribute("href", "https://www.gov.uk/student-finance-register-login");
    expect(sfe).toHaveAttribute("target", "_blank");
    expect(sfe).toHaveAttribute("rel", "noopener noreferrer");
    expect(sfe).toHaveTextContent("(opens in a new tab)");
    expect(screen.getByRole("link", { name: /Check your runway/ })).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Back to the blog" })[0]).toHaveAttribute(
      "href",
      "/blog",
    );
    expect(screen.getByRole("complementary", { name: "Quick tip" })).toBeInTheDocument();
    const more = screen.getByRole("region", { name: /Keep reading/ });
    expect(within(more).getAllByRole("article")).toHaveLength(2);
  });

  it("sends the Dibs posts to /dibs", () => {
    for (const slug of ["holding-deposits-one-week-cap", "how-dibs-splits-rent"]) {
      const post = getPost(slug);
      if (!post) throw new Error("missing post");
      const { unmount } = render(<BlogPostPage post={post} />);
      expect(screen.getByRole("link", { name: /Open Dibs/ })).toHaveAttribute("href", "/dibs");
      unmount();
    }
  });

  it("shows a friendly not-found message with every post", () => {
    render(<BlogPostNotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This post ghosted us.");
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
});
