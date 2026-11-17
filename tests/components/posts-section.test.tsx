// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostsSection } from "@/components/posts/posts-section";
import type { Post } from "@/lib/validation/posts";
import messages from "../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string | { pathname: string; query?: Record<string, string> }; children: ReactNode }) => {
    const url = typeof href === "string" ? href : `${href.pathname}?${new URLSearchParams(href.query).toString()}`;
    return (
      <a href={url} {...props}>
        {children}
      </a>
    );
  },
}));

const post = (id: number, name: string, rating = 5, photos: string[] = []): Post => ({
  id,
  story: `Story number ${id}, a long enough text.`,
  rating,
  visitedAt: "2026-11-08",
  createdAt: "2026-11-09T10:00:00.000Z",
  author: { name },
  photos: photos.map((url) => ({ url })),
});

const renderSection = (props: Partial<React.ComponentProps<typeof PostsSection>> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages} onError={(error) => { throw error; }}>
      <PostsSection
        slug="bou-sra-waterfall"
        placeName="Bou Sra Waterfall"
        rating={{ average: 4.5, count: 2 }}
        initialPosts={[post(1, "Vanna"), post(2, "Emma", 4)]}
        total={2}
        {...props}
      />
    </NextIntlClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PostsSection", () => {
  it("shows the average rating and each experience with its stars and visit day", () => {
    renderSection();
    expect(screen.getByText("4.5 out of 5 · 2 posts")).toBeInTheDocument();
    const posts = screen.getAllByTestId("post");
    expect(posts).toHaveLength(2);
    expect(posts[0]).toHaveTextContent("Vanna");
    expect(posts[0]).toHaveTextContent("Visited November 8, 2026");
    expect(posts[1].querySelector('[role="img"]')).toHaveAttribute("aria-label", "Rated 4 out of 5");
  });

  it("says when nobody has rated yet and invites the first post", () => {
    renderSection({ rating: { average: null, count: 0 }, initialPosts: [], total: 0 });
    expect(screen.getByText("No ratings yet")).toBeInTheDocument();
    expect(screen.getByText("No experiences shared yet. Be the first to share yours.")).toBeInTheDocument();
  });

  it("links to the share page with this place already chosen", () => {
    renderSection();
    expect(screen.getByRole("link", { name: "Share your experience" })).toHaveAttribute("href", "/share?place=bou-sra-waterfall");
  });

  it("shows photos lazily with a description", () => {
    renderSection({ initialPosts: [post(1, "Vanna", 5, ["https://photos.example.com/a.webp"])], total: 1 });
    const img = screen.getByRole("img", { name: "Photo by Vanna" });
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("gives every experience its own Share button and address to jump to", () => {
    renderSection();
    expect(screen.getAllByRole("button", { name: "Share" })).toHaveLength(2);
    expect(document.getElementById("post-1")).not.toBeNull();
  });

  it("loads more experiences without repeating any", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [post(2, "Emma"), post(3, "Tom", 3)], meta: { total: 3 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderSection({ initialPosts: [post(1, "Vanna"), post(2, "Emma")], total: 3 });
    await user.click(screen.getByRole("button", { name: "Show more experiences" }));
    expect(await screen.findAllByTestId("post")).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/places/bou-sra-waterfall/posts?limit=5&offset=2", expect.anything());
    expect(screen.queryByRole("button", { name: "Show more experiences" })).not.toBeInTheDocument();
  });

  it("explains when more could not be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const user = userEvent.setup();
    renderSection({ total: 5 });
    await user.click(screen.getByRole("button", { name: "Show more experiences" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load more experiences.");
  });
});
