// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddPlaceForm } from "@/components/add-place/add-place-form";
import { CommentsSection } from "@/components/place/comments-section";
import { PostsSection } from "@/components/posts/posts-section";
import { AddPlaceFab } from "@/components/shell/add-place-fab";
import { AdminLink } from "@/components/shell/admin-link";
import { FeaturesProvider } from "@/components/shell/features-provider";
import { SharePostForm } from "@/components/share/share-post-form";
import type { ReleaseStage } from "@/lib/release-stage";
import messages from "../../messages/en.json";

// ---- Pretend the outside world ----
const auth = { isLoaded: true, isSignedIn: true };
vi.mock("@clerk/nextjs", () => ({ useAuth: () => auth, useClerk: () => ({ openSignIn: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string | { pathname: string; query?: Record<string, string> }; children: ReactNode }) => {
    const url = typeof href === "string" ? href : href.pathname;
    return (
      <a href={url} {...props}>
        {children}
      </a>
    );
  },
  usePathname: () => "/en",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/images", () => ({ prepareImage: vi.fn() }));

type Who = "visitor" | "user" | "admin" | "banned-admin";
let meRequests = 0;

function mount(stage: ReleaseStage, who: Who, ui: ReactElement) {
  auth.isLoaded = true;
  auth.isSignedIn = who !== "visitor";
  meRequests = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/v1/me") {
        meRequests++;
        const role = who.endsWith("admin") ? "admin" : "user";
        return new Response(JSON.stringify({ data: { name: "X", role, banned: who === "banned-admin" } }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }),
  );
  return render(
    <NextIntlClientProvider locale="en" messages={messages} onError={(error) => { throw error; }}>
      <FeaturesProvider stage={stage}>{ui}</FeaturesProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const comments = <CommentsSection slug="bou-sra-waterfall" initialComments={[]} total={0} />;
const posts = (
  <PostsSection slug="bou-sra-waterfall" placeName="Bou Sra" rating={{ average: null, count: 0 }} initialPosts={[]} total={0} />
);

describe("the floating Add a place button", () => {
  it.each([1, 2] as const)("is hidden from a regular person at stage %i", (stage) => {
    mount(stage, "user", <AddPlaceFab />);
    expect(screen.queryByRole("link", { name: "Add a place" })).not.toBeInTheDocument();
  });

  it("is hidden from a visitor who is not logged in until stage 3", () => {
    mount(2, "visitor", <AddPlaceFab />);
    expect(screen.queryByRole("link", { name: "Add a place" })).not.toBeInTheDocument();
  });

  it.each([3, 4] as const)("is shown at stage %i", (stage) => {
    mount(stage, "user", <AddPlaceFab />);
    expect(screen.getByRole("link", { name: "Add a place" })).toBeInTheDocument();
  });

  it("is shown to an admin even at stage 1, once we know they are an admin", async () => {
    mount(1, "admin", <AddPlaceFab />);
    expect(await screen.findByRole("link", { name: "Add a place" })).toBeInTheDocument();
  });

  it("is not shown to a banned admin", async () => {
    mount(1, "banned-admin", <AddPlaceFab />);
    await waitFor(() => expect(meRequests).toBe(1));
    expect(screen.queryByRole("link", { name: "Add a place" })).not.toBeInTheDocument();
  });
});

describe("comments", () => {
  it("shows 'Comments will open soon' and no form at stage 1", async () => {
    mount(1, "user", comments);
    // It first checks quietly whether an admin is looking, then shows the notice.
    expect(await screen.findByText("Comments will open soon.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows the notice to a visitor at once", () => {
    mount(1, "visitor", comments);
    expect(screen.getByText("Comments will open soon.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows the form from stage 2", () => {
    mount(2, "user", comments);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByText("Comments will open soon.")).not.toBeInTheDocument();
  });

  it("gives an admin the form at stage 1", async () => {
    mount(1, "admin", comments);
    expect(await screen.findByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByText("Comments will open soon.")).not.toBeInTheDocument();
  });
});

describe("share your experience button on a place", () => {
  it.each([1, 2] as const)("is hidden at stage %i", (stage) => {
    mount(stage, "user", posts);
    expect(screen.queryByRole("link", { name: "Share your experience" })).not.toBeInTheDocument();
  });
  it("is shown from stage 3", () => {
    mount(3, "user", posts);
    expect(screen.getByRole("link", { name: "Share your experience" })).toBeInTheDocument();
  });
});

describe("the Add a place form", () => {
  const form = <AddPlaceForm provinces={[]} categories={[]} />;

  it("says it is not open yet to a regular person at stage 2", async () => {
    mount(2, "user", form);
    expect(await screen.findByRole("heading", { name: "Adding places is not open yet" })).toBeInTheDocument();
    expect(screen.queryByLabelText("2. Name of the place")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Team member? Log in" })).not.toBeInTheDocument();
  });

  it("offers a visitor a quiet way for team members to log in", () => {
    mount(1, "visitor", form);
    expect(screen.getByRole("heading", { name: "Adding places is not open yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team member? Log in" })).toHaveAttribute("href", "/sign-in");
  });

  it("shows the form to an admin at stage 1", async () => {
    mount(1, "admin", form);
    expect(await screen.findByLabelText("2. Name of the place")).toBeInTheDocument();
  });

  it("shows the form to everyone logged in at stage 3, and the login prompt to visitors", () => {
    mount(3, "user", form);
    expect(screen.getByLabelText("2. Name of the place")).toBeInTheDocument();
    cleanup();
    mount(3, "visitor", form);
    expect(screen.getByRole("heading", { name: "Log in to add a place" })).toBeInTheDocument();
  });

  it("waits quietly while it checks whether the person is an admin", () => {
    auth.isLoaded = true;
    mount(1, "user", form);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});

describe("the share form", () => {
  const form = <SharePostForm preselected={null} today="2026-11-17" />;

  it("says sharing is not open yet at stage 2", async () => {
    mount(2, "user", form);
    expect(await screen.findByRole("heading", { name: "Sharing is not open yet" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("shows the form from stage 3", () => {
    mount(3, "user", form);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("shows the form to an admin at stage 1", async () => {
    mount(1, "admin", form);
    expect(await screen.findByRole("searchbox")).toBeInTheDocument();
  });
});

describe("the Admin link in the header", () => {
  it("is shown to an admin only", async () => {
    mount(4, "admin", <AdminLink />);
    expect(await screen.findByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    cleanup();
    mount(4, "user", <AdminLink />);
    await waitFor(() => expect(meRequests).toBe(1));
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    cleanup();
    mount(4, "visitor", <AdminLink />);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(meRequests).toBe(0);
  });

  it("is hidden for a banned admin", async () => {
    mount(4, "banned-admin", <AdminLink />);
    await waitFor(() => expect(meRequests).toBe(1));
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("asks who is logged in only once for the whole page", async () => {
    mount(1, "admin", (
      <>
        <AdminLink />
        <AddPlaceFab />
        {comments}
      </>
    ));
    await screen.findByRole("link", { name: "Admin" });
    expect(meRequests).toBe(1);
  });
});
