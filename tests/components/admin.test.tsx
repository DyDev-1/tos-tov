// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAction } from "@/components/admin/admin-action";
import { AdminNav } from "@/components/admin/admin-nav";
import { BanControl } from "@/components/admin/ban-control";
import { CategoryManager } from "@/components/admin/category-manager";
import { GuideManager } from "@/components/admin/guide-manager";
import { Pagination, SearchBox, StatusTabs } from "@/components/admin/list-controls";
import { CommentsAdminList, LogList, OverviewCards, PlacesAdminList, PostsAdminList, ReportsAdminList, UsersAdminList } from "@/components/admin/lists";
import { MergePanel } from "@/components/admin/merge-panel";
import { PlaceEditor, type AdminPlaceDetail } from "@/components/admin/place-editor";
import en from "../../messages/en.json";
import km from "../../messages/km.json";

// ---- Pretend the outside world ----
const refresh = vi.fn();
let pathname = "/admin";
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string | { pathname: string; query?: Record<string, string> }; children: ReactNode }) => {
    const query = typeof href === "string" ? "" : new URLSearchParams(href.query).toString();
    const url = typeof href === "string" ? href : query ? `${href.pathname}?${query}` : href.pathname;
    return (
      <a href={url} {...props}>
        {children}
      </a>
    );
  },
  useRouter: () => ({ refresh }),
  usePathname: () => pathname,
}));

type Call = { url: string; method: string; body?: unknown };
let calls: Call[];
let respond: (url: string, method: string) => Response;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const okResponse = () => json(200, { data: { done: true } });
const failure = (status: number, code: string) => json(status, { error: { code, message: "x" } });

beforeEach(() => {
  calls = [];
  refresh.mockClear();
  pathname = "/admin";
  respond = () => okResponse();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ url: String(input), method, body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
      return respond(String(input), method);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const wrap = (ui: ReactElement, locale: "en" | "km" = "en") => (
  <NextIntlClientProvider
    locale={locale}
    messages={locale === "en" ? en : km}
    onError={(error) => {
      throw error;
    }}
  >
    {ui}
  </NextIntlClientProvider>
);
const view = (ui: ReactElement, locale: "en" | "km" = "en") => render(wrap(ui, locale));

const name = (en: string) => ({ en, km: `${en} km` });
const posted = (url: string) => calls.find((c) => c.url === url)!;

// ---------------------------------------------------------------- AdminAction

describe("AdminAction", () => {
  it("calls the admin API with the body, then refreshes the page's data", async () => {
    const user = userEvent.setup();
    view(<AdminAction label="Approve" endpoint="/api/v1/admin/places/1/status" body={{ status: "published" }} />);
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ url: "/api/v1/admin/places/1/status", method: "POST", body: { status: "published" } }]);
  });

  it("asks first when it is a risky action, and does nothing on No", async () => {
    const user = userEvent.setup();
    view(<AdminAction label="Hide" endpoint="/x" confirm="Are you sure?" variant="danger" />);
    await user.click(screen.getByRole("button", { name: "Hide" }));
    expect(calls).toHaveLength(0);
    expect(screen.getByRole("group", { name: "Are you sure?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(calls).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
  });

  it("goes ahead on Yes", async () => {
    const user = userEvent.setup();
    view(<AdminAction label="Delete" endpoint="/api/v1/admin/guides/4" method="DELETE" confirm="Are you sure?" />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toMatchObject({ url: "/api/v1/admin/guides/4", method: "DELETE" });
  });

  it.each([
    ["slug_taken", "That web name is already used."],
    ["already_merged", "This place was already merged into another."],
    ["forbidden", "You are not allowed to do this."],
    ["something_new", "Something went wrong. Please try again."],
  ])("explains error %s in words, and does not refresh", async (code, text) => {
    respond = () => failure(409, code);
    const user = userEvent.setup();
    view(<AdminAction label="Go" endpoint="/x" />);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("explains a network problem", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const user = userEvent.setup();
    view(<AdminAction label="Go" endpoint="/x" />);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  });
});

// ---------------------------------------------------------------- Lists

describe("PlacesAdminList", () => {
  const place = (id: number, status: "pending" | "published" | "hidden", extra = {}) => ({
    id, slug: `place-${id}`, name: name(`Place ${id}`), province: { slug: "p", name: name("Kampot") }, category: { slug: "c", name: name("Temples") },
    status, mergedInto: null as number | null, addedBy: "Dara", createdAt: "2026-11-16T10:00:00.000Z", ...extra,
  });

  it("offers Approve and Hide for a place that is waiting", () => {
    view(<PlacesAdminList items={[place(1, "pending")]} />);
    const row = screen.getByTestId("admin-place");
    expect(within(row).getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Hide" })).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/admin/places/1");
    expect(within(row).queryByRole("link", { name: "View on site" })).not.toBeInTheDocument();
    expect(within(row).getByText("Waiting")).toBeInTheDocument();
  });

  it("offers Hide and View on site for a published place", () => {
    view(<PlacesAdminList items={[place(2, "published")]} />);
    const row = screen.getByTestId("admin-place");
    expect(within(row).getByRole("button", { name: "Hide" })).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "View on site" })).toHaveAttribute("href", "/places/place-2");
  });

  it("offers Show again for a hidden place, but not for a merged one", () => {
    view(<PlacesAdminList items={[place(3, "hidden"), place(4, "hidden", { mergedInto: 9 })]} />);
    const [hidden, merged] = screen.getAllByTestId("admin-place");
    expect(within(hidden).getByRole("button", { name: "Show again" })).toBeInTheDocument();
    expect(within(merged).queryByRole("button", { name: "Show again" })).not.toBeInTheDocument();
    expect(within(merged).getByText("Merged into another place")).toBeInTheDocument();
  });

  it("asks before hiding and sends the right request", async () => {
    const user = userEvent.setup();
    view(<PlacesAdminList items={[place(2, "published")]} />);
    await user.click(screen.getByRole("button", { name: "Hide" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toEqual({ url: "/api/v1/admin/places/2/status", method: "POST", body: { status: "hidden" } });
  });

  it("says when there is nothing", () => {
    view(<PlacesAdminList items={[]} />);
    expect(screen.getByText("No places match.")).toBeInTheDocument();
  });
});

describe("PostsAdminList and CommentsAdminList", () => {
  const post = (id: number, status: "pending" | "published" | "hidden") => ({
    id, status, rating: 4, story: `Story ${id} about the place.`, visitedAt: "2026-11-01", createdAt: "2026-11-02T10:00:00.000Z",
    author: { name: "Vanna" }, place: { slug: "bou-sra", name: name("Bou Sra") },
  });

  it("approves a waiting post", async () => {
    const user = userEvent.setup();
    view(<PostsAdminList items={[post(5, "pending")]} />);
    const row = screen.getByTestId("admin-post");
    expect(within(row).getByText("Story 5 about the place.")).toBeInTheDocument();
    expect(within(row).getByRole("img", { name: "Rated 4 out of 5" })).toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toEqual({ url: "/api/v1/admin/posts/5/status", method: "POST", body: { status: "published" } });
  });

  it("offers Show again and Hide for a hidden / published post", () => {
    view(<PostsAdminList items={[post(1, "hidden"), post(2, "published")]} />);
    const [hidden, published] = screen.getAllByTestId("admin-post");
    expect(within(hidden).getByRole("button", { name: "Show again" })).toBeInTheDocument();
    expect(within(hidden).queryByRole("button", { name: "Hide" })).not.toBeInTheDocument();
    expect(within(published).getByRole("button", { name: "Hide" })).toBeInTheDocument();
    expect(within(published).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("hides and restores comments", async () => {
    const user = userEvent.setup();
    const comment = (id: number, status: "published" | "hidden") => ({ id, status, body: `Comment ${id}`, createdAt: "2026-11-02T10:00:00.000Z", author: { name: "Emma" }, place: { slug: "x", name: name("X") } });
    view(<CommentsAdminList items={[comment(1, "published"), comment(2, "hidden")]} />);
    const [shown, hidden] = screen.getAllByTestId("admin-comment");
    await user.click(within(hidden).getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toEqual({ url: "/api/v1/admin/comments/2/status", method: "POST", body: { status: "published" } });
    expect(within(shown).getByRole("button", { name: "Hide" })).toBeInTheDocument();
  });
});

describe("ReportsAdminList", () => {
  const report = (id: number, status: "open" | "resolved", placeStatus: "published" | "hidden" = "published") => ({
    id, reason: "closed" as const, message: "The gate was locked", status, createdAt: "2026-11-02T10:00:00.000Z",
    reporter: { name: "Sok" }, place: { id: 7, slug: "bou-sra", name: name("Bou Sra"), status: placeStatus },
  });

  it("shows the reason, who reported, the message and the place", () => {
    view(<ReportsAdminList items={[report(1, "open")]} />);
    const row = screen.getByTestId("admin-report");
    expect(within(row).getByText("Place is closed or gone")).toBeInTheDocument();
    expect(within(row).getByText(/Reported by Sok/)).toBeInTheDocument();
    expect(within(row).getByText("The gate was locked")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/admin/places/7");
  });

  it("can mark an open report handled, and hide the place", async () => {
    const user = userEvent.setup();
    view(<ReportsAdminList items={[report(1, "open")]} />);
    await user.click(screen.getByRole("button", { name: "Mark as handled" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toMatchObject({ url: "/api/v1/admin/reports/1/resolve", method: "POST" });
    expect(screen.getByRole("button", { name: "Hide the place" })).toBeInTheDocument();
  });

  it("has nothing to do for a handled report on a hidden place", () => {
    view(<ReportsAdminList items={[report(2, "resolved", "hidden")]} />);
    const row = screen.getByTestId("admin-report");
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("UsersAdminList and BanControl", () => {
  const person = (id: number, extra = {}) => ({ id, name: `Person ${id}`, email: `p${id}@example.com`, role: "user" as const, trusted: false, bannedAt: null as string | null, bannedReason: null as string | null, createdAt: "2026-10-01T00:00:00.000Z", ...extra });

  it("shows an admin without a ban control, and a banned person with their reason and Lift ban", async () => {
    const user = userEvent.setup();
    view(<UsersAdminList items={[person(1, { role: "admin" }), person(2, { bannedAt: "2026-11-01T00:00:00.000Z", bannedReason: "Posting spam" })]} />);
    const [admin, banned] = screen.getAllByTestId("admin-user");
    expect(within(admin).getByText("Admin")).toBeInTheDocument();
    expect(within(admin).queryByRole("button")).not.toBeInTheDocument();
    expect(within(banned).getByText("Banned: Posting spam")).toBeInTheDocument();
    await user.click(within(banned).getByRole("button", { name: "Lift ban" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toMatchObject({ url: "/api/v1/admin/users/2/ban", method: "DELETE" });
  });

  it("needs a reason of at least 3 letters before Ban can be pressed", async () => {
    const user = userEvent.setup();
    view(<BanControl userId={9} name="Troll" />);
    expect(screen.getByRole("button", { name: "Ban" })).toBeDisabled();
    await user.type(screen.getByLabelText("Reason for the ban"), "ab");
    expect(screen.getByRole("button", { name: "Ban" })).toBeDisabled();
    await user.type(screen.getByLabelText("Reason for the ban"), "c");
    expect(screen.getByRole("button", { name: "Ban" })).toBeEnabled();
  });

  it("asks to confirm, then sends the reason", async () => {
    const user = userEvent.setup();
    view(<BanControl userId={9} name="Troll" />);
    await user.type(screen.getByLabelText("Reason for the ban"), "  Posting spam  ");
    await user.click(screen.getByRole("button", { name: "Ban" }));
    expect(screen.getByRole("group", { name: "Ban Troll?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toEqual({ url: "/api/v1/admin/users/9/ban", method: "POST", body: { reason: "Posting spam" } });
  });

  it("explains that admins cannot be banned when the server says so", async () => {
    respond = () => failure(403, "cannot_ban_admin");
    const user = userEvent.setup();
    view(<BanControl userId={9} name="Someone" />);
    await user.type(screen.getByLabelText("Reason for the ban"), "Because");
    await user.click(screen.getByRole("button", { name: "Ban" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Admins cannot be banned.");
  });
});

describe("LogList and OverviewCards", () => {
  it("shows what was done in words, by whom, and the details", () => {
    view(
      <LogList
        items={[
          { id: 1, action: "place.merge", target: { type: "place", id: 4 }, details: { mergedId: 9, fields: ["a", "b"] }, admin: { name: "Dara" }, createdAt: "2026-11-02T10:00:00.000Z" },
          { id: 2, action: "future.action", target: { type: "thing", id: null }, details: {}, admin: { name: "Sok" }, createdAt: "2026-11-02T10:00:00.000Z" },
        ]}
      />,
    );
    const [merge, unknown] = screen.getAllByTestId("admin-log");
    expect(merge).toHaveTextContent("Merged places");
    expect(merge).toHaveTextContent("place #4");
    expect(merge).toHaveTextContent("by Dara");
    expect(merge).toHaveTextContent("mergedId: 9 · fields: a, b");
    expect(unknown).toHaveTextContent("future.action");
  });

  it("says when nothing has been done", () => {
    view(<LogList items={[]} />);
    expect(screen.getByText("Nothing has been done yet.")).toBeInTheDocument();
  });

  it("links each queue to its list, and says all is clear when nothing waits", () => {
    const { unmount } = view(<OverviewCards data={{ pendingPlaces: 3, pendingPosts: 0, openReports: 1, totalPlaces: 8, totalUsers: 12, bannedUsers: 2 }} />);
    expect(screen.getByTestId("queue-pendingPlaces")).toHaveAttribute("href", "/admin/places?status=pending");
    expect(screen.getByTestId("queue-pendingPlaces")).toHaveTextContent("3");
    expect(screen.getByTestId("queue-openReports")).toHaveAttribute("href", "/admin/reports?status=open");
    expect(screen.queryByText("Nothing is waiting. Well done.")).not.toBeInTheDocument();
    unmount();
    view(<OverviewCards data={{ pendingPlaces: 0, pendingPosts: 0, openReports: 0, totalPlaces: 8, totalUsers: 12, bannedUsers: 0 }} />);
    expect(screen.getByText("Nothing is waiting. Well done.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- Controls

describe("list controls", () => {
  it("StatusTabs keep the search words and mark the current tab", () => {
    view(<StatusTabs pathname="/admin/places" statuses={["pending", "published", "hidden"]} current="pending" q="bou" allLabel />);
    expect(screen.getByRole("link", { name: "Waiting" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Waiting" })).toHaveAttribute("href", "/admin/places?status=pending&q=bou");
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/admin/places?q=bou");
  });

  it("SearchBox sends ?q= and keeps the status", () => {
    view(<SearchBox action="/en/admin/places" q="bou" status="hidden" placeholder="Search" />);
    expect(screen.getByRole("search")).toHaveAttribute("action", "/en/admin/places");
    expect(screen.getByRole("searchbox")).toHaveValue("bou");
    expect(document.querySelector('input[name="status"]')).toHaveValue("hidden");
  });

  it("Pagination shows the page and links to the neighbours, or nothing for one page", () => {
    const { unmount } = view(<Pagination pathname="/admin/log" page={2} total={50} pageSize={20} query={{ q: "x" }} />);
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/admin/log?q=x");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/admin/log?q=x&page=3");
    unmount();
    view(<Pagination pathname="/admin/log" page={1} total={5} pageSize={20} query={{}} />);
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it("AdminNav marks the current area, and the overview only on its own page", () => {
    pathname = "/admin/places/3";
    const { unmount } = view(<AdminNav />);
    expect(screen.getByRole("link", { name: "Places" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    unmount();
    pathname = "/admin";
    view(<AdminNav />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  });
});

// ---------------------------------------------------------------- Categories

describe("CategoryManager", () => {
  const categories = [
    { id: 1, slug: "temples", name: name("Temples"), sortOrder: 1, placeCount: 2 },
    { id: 2, slug: "markets", name: name("Markets"), sortOrder: 2, placeCount: 0 },
  ];

  it("lets an empty category be deleted, but not one that still has places", () => {
    view(<CategoryManager categories={categories} />);
    const [used, empty] = screen.getAllByTestId("admin-category");
    expect(within(used).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(within(used).getByText(/2 places/)).toBeInTheDocument();
    expect(within(empty).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("adds a category and refreshes", async () => {
    const user = userEvent.setup();
    view(<CategoryManager categories={categories} />);
    const form = screen.getByRole("form", { name: "Add a category" });
    await user.type(within(form).getByLabelText(/Name \(English\)/), "Night markets");
    await user.type(within(form).getByLabelText(/Name \(Khmer\)/), "ផ្សារយប់");
    await user.type(within(form).getByLabelText(/Web name/), "night-markets");
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toEqual({ url: "/api/v1/admin/categories", method: "POST", body: { slug: "night-markets", nameEn: "Night markets", nameKm: "ផ្សារយប់" } });
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });

  it("explains a web name that is already used", async () => {
    respond = () => failure(409, "slug_taken");
    const user = userEvent.setup();
    view(<CategoryManager categories={categories} />);
    const form = screen.getByRole("form", { name: "Add a category" });
    await user.type(within(form).getByLabelText(/Name \(English\)/), "Temples 2");
    await user.type(within(form).getByLabelText(/Name \(Khmer\)/), "ប្រាសាទ");
    await user.type(within(form).getByLabelText(/Web name/), "temples");
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("That web name is already used.");
  });

  it("edits a category with PATCH, including its order", async () => {
    const user = userEvent.setup();
    view(<CategoryManager categories={categories} />);
    const row = screen.getAllByTestId("admin-category")[0];
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    const english = within(row).getByLabelText(/Name \(English\)/);
    await user.clear(english);
    await user.type(english, "Old temples");
    const order = within(row).getByLabelText(/Order/);
    await user.clear(order);
    await user.type(order, "0");
    await user.click(within(row).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toEqual({ url: "/api/v1/admin/categories/1", method: "PATCH", body: { slug: "temples", nameEn: "Old temples", nameKm: "Temples km", sortOrder: 0 } });
  });

  it("deletes an empty category after asking", async () => {
    const user = userEvent.setup();
    view(<CategoryManager categories={categories} />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("group", { name: "Delete the category Markets?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toMatchObject({ url: "/api/v1/admin/categories/2", method: "DELETE" });
  });
});

// ---------------------------------------------------------------- Merge, guides, editor

describe("MergePanel", () => {
  const row = (id: number, slug: string, status: "pending" | "published" | "hidden" = "published", mergedInto: number | null = null) => ({
    id, slug, name: name(slug), province: { slug: "p", name: name("Kampot") }, category: { slug: "c", name: name("Temples") }, status, mergedInto, addedBy: null, createdAt: "2026-11-01T00:00:00.000Z",
  });

  it("searches, skips places that cannot take a merge, and merges after a confirmation", async () => {
    respond = (url) =>
      url.startsWith("/api/v1/admin/places?q=")
        ? json(200, { data: [row(5, "this-one"), row(6, "hidden-one", "hidden"), row(7, "merged-one", "published", 2), row(8, "keep-me")] })
        : okResponse();
    const user = userEvent.setup();
    view(<MergePanel placeId={5} />);
    await user.type(screen.getByLabelText("Find the place to keep"), "keep");
    const results = await screen.findAllByTestId("merge-result", {}, { timeout: 3000 });
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveTextContent("keep-me");

    await user.click(results[0]);
    await user.click(screen.getByRole("button", { name: "Merge into keep-me" }));
    expect(screen.getByRole("group", { name: "Merge this place into keep-me?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(posted("/api/v1/admin/places/5/merge")).toMatchObject({ method: "POST", body: { targetId: 8 } });
  });

  it("lets the admin change their mind", async () => {
    respond = () => json(200, { data: [row(8, "keep-me")] });
    const user = userEvent.setup();
    view(<MergePanel placeId={5} />);
    await user.type(screen.getByLabelText("Find the place to keep"), "keep");
    await user.click((await screen.findAllByTestId("merge-result", {}, { timeout: 3000 }))[0]);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByLabelText("Find the place to keep")).toBeInTheDocument();
  });
});

describe("GuideManager", () => {
  const guide = { id: 4, name: "Sophea", tour: { en: "Day trip", km: "ដំណើរមួយថ្ងៃ" }, priceText: "$25", contactType: "telegram" as const, contactValue: "sophea_guide" };

  it("lists guides with their contact", () => {
    view(<GuideManager placeId={1} guides={[guide]} />);
    expect(screen.getByTestId("admin-guide")).toHaveTextContent("Sophea");
    expect(screen.getByTestId("admin-guide")).toHaveTextContent("Telegram sophea_guide");
  });

  it("says when there are no guides", () => {
    view(<GuideManager placeId={1} guides={[]} />);
    expect(screen.getByText("No guides yet.")).toBeInTheDocument();
  });

  it("adds a phone guide", async () => {
    const user = userEvent.setup();
    view(<GuideManager placeId={1} guides={[]} />);
    const form = screen.getByRole("form", { name: "Add a guide" });
    await user.type(within(form).getByLabelText("Guide name"), "Dara");
    await user.type(within(form).getByLabelText("Tour (English)"), "Forest walk");
    await user.type(within(form).getByLabelText("Tour (Khmer)"), "ដើរព្រៃ");
    await user.selectOptions(within(form).getByLabelText("Contact by"), "phone");
    await user.type(within(form).getByLabelText("Phone"), "+855 12 345 678");
    expect(within(form).getByLabelText("Phone")).toHaveAccessibleDescription("For example +855 12 345 678");
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toEqual({
      url: "/api/v1/admin/places/1/guides",
      method: "POST",
      body: { name: "Dara", tourEn: "Forest walk", tourKm: "ដើរព្រៃ", priceText: null, contactType: "phone", contactValue: "+855 12 345 678" },
    });
  });

  it("edits a guide with PUT and deletes one after asking", async () => {
    const user = userEvent.setup();
    view(<GuideManager placeId={1} guides={[guide]} />);
    const row = screen.getByTestId("admin-guide");
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    const nameBox = within(row).getByLabelText("Guide name");
    await user.clear(nameBox);
    await user.type(nameBox, "Sophea K.");
    await user.click(within(row).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(calls[0]).toMatchObject({ url: "/api/v1/admin/guides/4", method: "PUT", body: { name: "Sophea K.", priceText: "$25", contactType: "telegram" } });

    await user.click(within(row).getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(calls.at(-1)).toMatchObject({ url: "/api/v1/admin/guides/4", method: "DELETE" }));
  });

  it("explains a refused contact", async () => {
    respond = () => failure(400, "invalid_body");
    const user = userEvent.setup();
    view(<GuideManager placeId={1} guides={[]} />);
    const form = screen.getByRole("form", { name: "Add a guide" });
    await user.type(within(form).getByLabelText("Guide name"), "Dara");
    await user.type(within(form).getByLabelText("Tour (English)"), "Walk");
    await user.type(within(form).getByLabelText("Tour (Khmer)"), "ដើរ");
    await user.type(within(form).getByLabelText("Telegram"), "@bad");
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("Some details are not valid");
  });
});

describe("PlaceEditor", () => {
  const place: AdminPlaceDetail = {
    id: 3, slug: "bou-sra", name: name("Bou Sra"), tagline: { en: "Full flow", km: null }, description: { en: "A waterfall.", km: null },
    province: { slug: "mondulkiri", name: name("Mondulkiri") }, category: { slug: "waterfalls", name: name("Waterfalls") },
    location: { lat: 12.5135, lng: 107.4287 }, entryFee: { khr: null, usd: 2.5 }, bestMonths: [7, 8], avoidMonths: [3],
    details: { ticket: { en: "Pay at the gate" } }, status: "published", mergedInto: null, likesCount: 10, addedBy: "Sokha",
    createdAt: "2026-11-01T00:00:00.000Z", guides: [], photos: [],
  };
  const provinces = [{ id: 1, slug: "mondulkiri", name: name("Mondulkiri") }, { id: 2, slug: "kampot", name: name("Kampot") }];
  const categoriesList = [{ id: 1, slug: "waterfalls", name: name("Waterfalls") }, { id: 2, slug: "temples", name: name("Temples") }];
  const renderEditor = () => view(<PlaceEditor place={place} provinces={provinces} categories={categoriesList} />);

  it("starts with the place's current values", () => {
    renderEditor();
    expect(screen.getByLabelText("Name (English)")).toHaveValue("Bou Sra");
    expect(screen.getByLabelText("Province")).toHaveValue("mondulkiri");
    expect(screen.getByLabelText(/Foreigners/)).toHaveValue("2.5");
    expect(screen.getByLabelText(/Cambodians/)).toHaveValue("");
    expect(document.querySelector('[aria-pressed="true"]')).not.toBeNull();
  });

  it("saves all fields with one PATCH, turning cleared boxes into null and dropping empty facts", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.clear(screen.getByLabelText("Short line (English)"));
    await user.selectOptions(screen.getByLabelText("Province"), "kampot");
    await user.type(screen.getByLabelText(/Cambodians/), "4000");
    await user.clear(screen.getByLabelText(/Foreigners/));
    await user.click(within(screen.getByRole("group", { name: "Best months" })).getByRole("button", { name: "Nov" }));
    await user.type(screen.getAllByPlaceholderText("Khmer")[0], "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    const call = calls[0];
    expect(call).toMatchObject({ url: "/api/v1/admin/places/3", method: "PATCH" });
    expect(call.body).toMatchObject({
      nameEn: "Bou Sra",
      taglineEn: null,
      provinceSlug: "kampot",
      categorySlug: "waterfalls",
      lat: 12.5135,
      lng: 107.4287,
      entryFeeKhr: 4000,
      entryFeeUsd: null,
      bestMonths: [7, 8, 11],
      avoidMonths: [3],
    });
    expect((call.body as { details: Record<string, unknown> }).details).toMatchObject({ ticket: { en: "Pay at the gate" } });
  });

  it("explains a refusal and keeps what was typed", async () => {
    respond = () => failure(400, "invalid_body");
    const user = userEvent.setup();
    renderEditor();
    await user.clear(screen.getByLabelText("Latitude"));
    await user.type(screen.getByLabelText("Latitude"), "48");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Some details are not valid");
    expect(screen.getByLabelText("Latitude")).toHaveValue("48");
  });
});

// ---------------------------------------------------------------- Khmer

describe("Khmer admin", () => {
  it("has every text the admin screens use (a missing one would throw)", () => {
    const row = { id: 1, slug: "s", name: name("Place"), province: { slug: "p", name: name("Kampot") }, category: { slug: "c", name: name("Temples") }, status: "pending" as const, mergedInto: null, addedBy: "Dara", createdAt: "2026-11-16T10:00:00.000Z" };
    view(
      <>
        <AdminNav />
        <OverviewCards data={{ pendingPlaces: 1, pendingPosts: 1, openReports: 1, totalPlaces: 1, totalUsers: 1, bannedUsers: 1 }} />
        <StatusTabs pathname="/admin/places" statuses={["pending", "published", "hidden"]} allLabel />
        <PlacesAdminList items={[row, { ...row, id: 2, status: "published" }, { ...row, id: 3, status: "hidden" }]} />
        <PostsAdminList items={[{ id: 1, status: "pending", rating: 5, story: "Story", visitedAt: "2026-11-01", createdAt: "2026-11-02T00:00:00.000Z", author: { name: "A" }, place: { slug: "x", name: name("X") } }]} />
        <ReportsAdminList items={[{ id: 1, reason: "unsafe", message: null, status: "open", createdAt: "2026-11-02T00:00:00.000Z", reporter: { name: "S" }, place: { id: 1, slug: "x", name: name("X"), status: "published" } }]} />
        <UsersAdminList items={[{ id: 1, name: "U", email: null, role: "user", trusted: false, bannedAt: null, bannedReason: null, createdAt: "2026-10-01T00:00:00.000Z" }]} />
        <LogList items={[{ id: 1, action: "user.ban", target: { type: "user", id: 1 }, details: { reason: "x" }, admin: { name: "A" }, createdAt: "2026-11-02T00:00:00.000Z" }]} />
        <CategoryManager categories={[{ id: 1, slug: "temples", name: name("Temples"), sortOrder: 1, placeCount: 0 }]} />
        <GuideManager placeId={1} guides={[]} />
        <MergePanel placeId={1} />
      </>,
      "km",
    );
    expect(screen.getAllByRole("link", { name: "កន្លែង" }).length).toBeGreaterThan(0);
    expect(screen.getByText("ដំណើរកម្សាន្ត និងមគ្គុទ្ទេសក៍មូលដ្ឋាន".slice(0, 0) + "មិនទាន់មានមគ្គុទ្ទេសក៍។")).toBeInTheDocument();
  });

  it("explains errors in Khmer", async () => {
    respond = () => failure(409, "slug_taken");
    const user = userEvent.setup();
    view(<AdminAction label="ធ្វើ" endpoint="/x" />, "km");
    await user.click(screen.getByRole("button", { name: "ធ្វើ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ឈ្មោះគេហទំព័រនោះត្រូវបានប្រើរួចហើយ។");
  });
});
