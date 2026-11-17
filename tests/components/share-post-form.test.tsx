// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SharePostForm } from "@/components/share/share-post-form";
import messages from "../../messages/en.json";

const auth = { isLoaded: true, isSignedIn: true };
vi.mock("@clerk/nextjs", () => ({ useAuth: () => auth }));
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
vi.mock("@/lib/images", () => ({
  prepareImage: vi.fn(async (file: File) => ({ blob: new Blob([file.name], { type: "image/webp" }), contentType: "image/webp" })),
}));

type Call = { url: string; method: string; body?: unknown };
let calls: Call[];
let responses: Record<string, () => Response>;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const place = (id: number, slug: string, en: string) => ({
  id,
  slug,
  name: { en, km: en },
  province: { id: 1, slug: "mondulkiri", name: { en: "Mondulkiri", km: "មណ្ឌលគិរី" } },
  category: { id: 1, slug: "waterfalls", name: { en: "Waterfalls", km: "ទឹកធ្លាក់" } },
});

function installFetch() {
  calls = [];
  responses = {
    search: () => json(200, { data: [place(1, "bou-sra-waterfall", "Bou Sra Waterfall"), place(2, "chambok-waterfall", "Chambok Waterfall")] }),
    upload: () => json(200, { data: { uploadUrl: "https://r2.example.com/put", publicUrl: "https://photos.example.com/places/1/x.webp", headers: { "Content-Type": "image/webp" } } }),
    put: () => new Response(null, { status: 200 }),
    post: () => json(201, { data: { id: 7, status: "pending" } }),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body });
      if (url.startsWith("/api/v1/places?q=")) return responses.search();
      if (url === "/api/v1/uploads/image") return responses.upload();
      if (url === "https://r2.example.com/put") return responses.put();
      if (/^\/api\/v1\/places\/[^/]+\/posts$/.test(url) && method === "POST") return responses.post();
      throw new Error(`Unexpected request: ${method} ${url}`);
    }),
  );
}
const callsTo = (fragment: string) => calls.filter((c) => c.url.includes(fragment));

const picked = { slug: "bou-sra-waterfall", name: "Bou Sra Waterfall", province: "Mondulkiri" };
const renderForm = (preselected: typeof picked | null = picked) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages} onError={(error) => { throw error; }}>
      <SharePostForm preselected={preselected} today="2026-11-17" />
    </NextIntlClientProvider>,
  );

const photo = (name = "falls.jpg") => new File(["x"], name, { type: "image/jpeg" });
const STORY = "A quiet morning with strong water and almost nobody around.";

beforeEach(() => {
  auth.isLoaded = true;
  auth.isSignedIn = true;
  installFetch();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => Number(setTimeout(() => cb(0), 0))) as typeof window.requestAnimationFrame;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("before the form", () => {
  it("asks a visitor to log in and comes back to the same place", () => {
    auth.isSignedIn = false;
    renderForm();
    expect(screen.getByRole("heading", { name: "Log in to share your experience" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toContain(encodeURIComponent("/en/share?place=bou-sra-waterfall"));
  });
});

describe("choosing the place", () => {
  it("starts on the place picked on the place page", () => {
    renderForm();
    expect(screen.getByTestId("selected-place")).toHaveTextContent("Bou Sra Waterfall");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("searches for a place by name and lets the person choose one", async () => {
    const user = userEvent.setup();
    renderForm(null);
    await user.type(screen.getByRole("searchbox"), "water");
    const results = await screen.findAllByTestId("place-result", {}, { timeout: 3000 });
    expect(results).toHaveLength(2);
    expect(callsTo("/api/v1/places?q=water")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Choose Chambok Waterfall" }));
    expect(screen.getByTestId("selected-place")).toHaveTextContent("Chambok Waterfall");
  });

  it("offers to add a new place when nothing matches", async () => {
    responses.search = () => json(200, { data: [] });
    const user = userEvent.setup();
    renderForm(null);
    await user.type(screen.getByRole("searchbox"), "zzzz");
    expect(await screen.findByText("No place found with that name.", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Not on the list? Add a new place" })).toHaveAttribute("href", "/add-place");
  });

  it("does not search for one letter", async () => {
    const user = userEvent.setup();
    renderForm(null);
    await user.type(screen.getByRole("searchbox"), "b");
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(callsTo("/api/v1/places?q=")).toHaveLength(0);
  });

  it("lets the person change the place", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });
});

describe("validation", () => {
  it("lists what is missing and sends nothing", async () => {
    const user = userEvent.setup();
    renderForm(null);
    await user.click(screen.getByRole("button", { name: "Share post" }));
    expect(await screen.findByText("Please fix the items marked below.")).toBeInTheDocument();
    expect(screen.getByText("Please choose a place.")).toBeInTheDocument();
    expect(screen.getByText("Please choose a rating.")).toBeInTheDocument();
    expect(screen.getByText("Please write at least 10 characters.")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("starts the date on today and does not allow a day in the future", async () => {
    const user = userEvent.setup();
    renderForm();
    const date = screen.getByLabelText("3. Day you visited");
    expect(date).toHaveValue("2026-11-17");
    expect(date).toHaveAttribute("max", "2026-11-17");
    await user.click(screen.getByRole("radio", { name: "4 stars" }));
    await user.type(screen.getByLabelText("4. Your story"), STORY);
    await user.clear(date);
    await user.type(date, "2999-01-01");
    await user.click(screen.getByRole("button", { name: "Share post" }));
    expect(await screen.findByText("Please choose a day that has already happened.")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("chooses stars like radio buttons", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("radio", { name: "3 stars" }));
    expect(screen.getByRole("radio", { name: "3 stars" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "5 stars" }));
    expect(screen.getByRole("radio", { name: "5 stars" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "3 stars" })).not.toBeChecked();
  });
});

describe("sending", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("radio", { name: "5 stars" }));
    await user.type(screen.getByLabelText("4. Your story"), STORY);
  }

  it("sends a post without photos", async () => {
    const user = userEvent.setup();
    renderForm();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Share post" }));

    expect(await screen.findByRole("heading", { name: "Thank you!" })).toBeInTheDocument();
    expect(screen.getByText("Your post was sent. An admin will check it before it appears.")).toBeInTheDocument();
    expect(callsTo("/api/v1/uploads/image")).toHaveLength(0);
    expect(callsTo("/posts")[0]).toMatchObject({
      url: "/api/v1/places/bou-sra-waterfall/posts",
      method: "POST",
      body: { story: STORY, rating: 5, visitedAt: "2026-11-17", photos: [] },
    });
  });

  it("uploads photos first, then sends the post with their addresses", async () => {
    const user = userEvent.setup();
    renderForm();
    await fill(user);
    await user.upload(screen.getByTestId("photo-input"), photo());
    await screen.findByTestId("photo-thumb");
    await user.click(screen.getByRole("button", { name: "Share post" }));
    await screen.findByRole("heading", { name: "Thank you!" });

    expect(calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST /api/v1/uploads/image",
      "PUT https://r2.example.com/put",
      "POST /api/v1/places/bou-sra-waterfall/posts",
    ]);
    expect((callsTo("/posts")[0].body as { photos: string[] }).photos).toEqual(["https://photos.example.com/places/1/x.webp"]);
  });

  it("offers to share the place once the post is sent", async () => {
    const user = userEvent.setup();
    renderForm();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Share post" }));
    await screen.findByRole("heading", { name: "Thank you!" });
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the place" })).toHaveAttribute("href", "/places/bou-sra-waterfall");
  });

  it("says the post is live when an admin sent it", async () => {
    responses.post = () => json(201, { data: { id: 7, status: "published" } });
    const user = userEvent.setup();
    renderForm();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Share post" }));
    expect(await screen.findByText("Your post is live.")).toBeInTheDocument();
  });

  it("can start another post", async () => {
    const user = userEvent.setup();
    renderForm();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Share post" }));
    await user.click(await screen.findByRole("button", { name: "Share another experience" }));
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByLabelText("4. Your story")).toHaveValue("");
  });

  it.each([
    ["too many posts", () => json(429, { error: { code: "rate_limited", message: "x" } }), "You shared several posts in a short time. Please try again later."],
    ["an expired login", () => json(401, { error: { code: "unauthorized", message: "x" } }), "Please log in again to send your post."],
    ["a server problem", () => json(500, { error: { code: "internal_error", message: "x" } }), "We could not send your post. Please try again."],
  ])("explains %s and keeps what was written", async (_name, response, message) => {
    responses.post = response;
    const user = userEvent.setup();
    renderForm();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Share post" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("4. Your story")).toHaveValue(STORY);
  });

  it("asks for another place when the chosen one is gone", async () => {
    responses.post = () => json(404, { error: { code: "not_found", message: "x" } });
    const user = userEvent.setup();
    renderForm();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Share post" }));
    expect(await screen.findByText("That place is not available any more. Please choose another.")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("explains when photo storage is not set up and sends nothing", async () => {
    responses.upload = () => json(503, { error: { code: "uploads_not_configured", message: "x" } });
    const user = userEvent.setup();
    renderForm();
    await fill(user);
    await user.upload(screen.getByTestId("photo-input"), photo());
    await screen.findByTestId("photo-thumb");
    await user.click(screen.getByRole("button", { name: "Share post" }));
    expect(await screen.findByText(/Photo uploads are not set up yet/)).toBeInTheDocument();
    expect(callsTo("/posts")).toHaveLength(0);
  });

  it("shows the selected place in the summary region", async () => {
    renderForm();
    expect(within(screen.getByRole("group", { name: "Selected place" })).getByText("Mondulkiri")).toBeInTheDocument();
  });
});
