// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddPlaceForm } from "@/components/add-place/add-place-form";
import messages from "../../messages/en.json";

// ---- Pretend the outside world ----
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
// The real map needs a browser with layout. This stand-in lets a test "tap the map".
vi.mock("@/components/map/cambodia-map", () => ({
  CambodiaMap: ({ onPinChange, label }: { onPinChange?: (lat: number, lng: number) => void; label: string }) => (
    <div role="region" aria-label={label}>
      <button type="button" onClick={() => onPinChange?.(12.5, 103.9)}>
        tap map
      </button>
      <button type="button" onClick={() => onPinChange?.(48.8, 2.3)}>
        tap far away
      </button>
    </div>
  ),
}));
vi.mock("@/lib/images", () => ({
  prepareImage: vi.fn(async (file: File) => ({ blob: new Blob([file.name], { type: "image/webp" }), contentType: "image/webp" })),
}));

const provinces = [
  { id: 1, slug: "siem-reap", name: { en: "Siem Reap", km: "សៀមរាប" } },
  { id: 2, slug: "pursat", name: { en: "Pursat", km: "ពោធិ៍សាត់" } },
];
const categories = [
  { id: 1, slug: "temples", name: { en: "Temples", km: "ប្រាសាទ" } },
  { id: 2, slug: "waterfalls", name: { en: "Waterfalls", km: "ទឹកធ្លាក់" } },
];

type Call = { url: string; method: string; body?: unknown };
let calls: Call[];
let responses: Record<string, () => Response>;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function installFetch() {
  calls = [];
  responses = {
    upload: () => json(200, { data: { uploadUrl: "https://r2.example.com/put", publicUrl: "https://photos.example.com/places/1/x.webp", headers: { "Content-Type": "image/webp" } } }),
    put: () => new Response(null, { status: 200 }),
    create: () => json(201, { data: { id: 5, slug: "hidden-pond", status: "pending" } }),
    nearby: () => json(200, { data: [] }),
    search: () => json(200, { data: [] }),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body });
      if (url === "/api/v1/uploads/image") return responses.upload();
      if (url === "https://r2.example.com/put") return responses.put();
      if (url === "/api/v1/places" && method === "POST") return responses.create();
      if (url.startsWith("/api/v1/places/nearby")) return responses.nearby();
      if (url.startsWith("/api/v1/places?")) return responses.search();
      throw new Error(`Unexpected request: ${method} ${url}`);
    }),
  );
}
const callsTo = (url: string) => calls.filter((c) => c.url === url || c.url.startsWith(url));

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} onError={(error) => { throw error; }}>
      <AddPlaceForm provinces={provinces} categories={categories} />
    </NextIntlClientProvider>,
  );
}

const photo = (name = "falls.jpg", type = "image/jpeg", size = 1000) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByTestId("photo-input"), photo());
  await screen.findByTestId("photo-thumb");
  await user.type(screen.getByLabelText("2. Name of the place"), "Hidden Pond");
  await user.selectOptions(screen.getByLabelText("3. Province"), "pursat");
  await user.selectOptions(screen.getByLabelText("Category"), "waterfalls");
  await user.click(screen.getByRole("button", { name: "tap map" }));
}

beforeEach(() => {
  auth.isLoaded = true;
  auth.isSignedIn = true;
  installFetch();
  window.localStorage.clear();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  // The map button scrolls nothing in tests.
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => Number(setTimeout(() => cb(0), 0))) as typeof window.requestAnimationFrame;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("before the form", () => {
  it("asks a logged-out visitor to log in, and comes back here afterwards", () => {
    auth.isSignedIn = false;
    renderForm();
    expect(screen.getByRole("heading", { name: "Log in to add a place" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/sign-in?redirect_url=%2Fen%2Fadd-place");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/sign-up?redirect_url=%2Fen%2Fadd-place");
    expect(screen.queryByLabelText("2. Name of the place")).not.toBeInTheDocument();
  });

  it("shows a loading state until Clerk knows who is here", () => {
    auth.isLoaded = false;
    renderForm();
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });
});

describe("validation", () => {
  it("lists every missing required step and sends nothing", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Send place" }));

    expect(await screen.findByText("Please fix the items marked below.")).toBeInTheDocument();
    expect(screen.getByText("Please enter the name of the place.")).toBeInTheDocument();
    expect(screen.getByText("Please choose a province.")).toBeInTheDocument();
    expect(screen.getByText("Please choose a category.")).toBeInTheDocument();
    expect(screen.getByText("Please add at least one photo.")).toBeInTheDocument();
    expect(screen.getByText("Please move the pin to the place.")).toBeInTheDocument();
    expect(screen.getByLabelText("2. Name of the place")).toHaveAttribute("aria-invalid", "true");
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("clears an error once the step is done", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Send place" }));
    await user.click(await screen.findByRole("button", { name: "tap map" }));
    expect(screen.queryByText("Please move the pin to the place.")).not.toBeInTheDocument();
  });

  it("does not accept a pin outside Cambodia", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "tap far away" }));
    expect(screen.getByText("This spot is outside Cambodia. Please move the pin.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send place" }));
    expect(screen.getAllByText("This spot is outside Cambodia. Please move the pin.").length).toBeGreaterThan(0);
  });

  it("checks the entry fees", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Entry fee, Cambodians/), "12.5");
    await user.type(screen.getByLabelText(/Entry fee, foreigners/), "abc");
    await user.click(screen.getByRole("button", { name: "Send place" }));
    expect(await screen.findByText("Please use a whole number, 0 or more.")).toBeInTheDocument();
    expect(screen.getByText("Please use a number, 0 or more.")).toBeInTheDocument();
  });

  it("accepts 0 as a free entry", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/Entry fee, Cambodians/), "0");
    await user.type(screen.getByLabelText(/Entry fee, foreigners/), "0");
    await user.click(screen.getByRole("button", { name: "Send place" }));
    await screen.findByRole("heading", { name: "Thank you!" });
    const create = callsTo("/api/v1/places").find((c) => c.method === "POST")!;
    expect(create.body).toMatchObject({ entryFeeKhr: 0, entryFeeUsd: 0 });
  });
});

describe("photos", () => {
  it("shows each photo, marks the first as the cover, and counts them", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.upload(screen.getByTestId("photo-input"), [photo("a.jpg"), photo("b.jpg")]);
    expect(await screen.findAllByTestId("photo-thumb")).toHaveLength(2);
    expect(screen.getAllByText("Cover")).toHaveLength(1);
    expect(screen.getByText(/2 of 10 photos/)).toBeInTheDocument();
  });

  it("refuses files that are not images, and photos over 10 MB", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderForm();
    await user.upload(screen.getByTestId("photo-input"), [
      photo("notes.pdf", "application/pdf"),
      photo("huge.jpg", "image/jpeg", 11 * 1024 * 1024),
      photo("ok.jpg"),
    ]);
    expect(await screen.findByText("notes.pdf is not an image.")).toBeInTheDocument();
    expect(screen.getByText("huge.jpg is larger than 10 MB.")).toBeInTheDocument();
    expect(screen.getAllByTestId("photo-thumb")).toHaveLength(1);
  });

  it("stops at 10 photos", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.upload(screen.getByTestId("photo-input"), Array.from({ length: 12 }, (_, i) => photo(`p${i}.jpg`)));
    await waitFor(() => expect(screen.getAllByTestId("photo-thumb")).toHaveLength(10));
    expect(screen.getByText("You can add up to 10 photos.")).toBeInTheDocument();
    expect(screen.getByTestId("photo-input")).toBeDisabled();
  });

  it("removes a photo", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.upload(screen.getByTestId("photo-input"), [photo("a.jpg"), photo("b.jpg")]);
    await screen.findAllByTestId("photo-thumb");
    await user.click(screen.getByRole("button", { name: "Remove photo 1" }));
    expect(screen.getAllByTestId("photo-thumb")).toHaveLength(1);
  });
});

describe("months", () => {
  it("turns months on and off", async () => {
    const user = userEvent.setup();
    renderForm();
    const nov = document.querySelector('[data-month="11"]') as HTMLElement;
    expect(nov).toHaveAttribute("aria-pressed", "false");
    await user.click(nov);
    expect(nov).toHaveAttribute("aria-pressed", "true");
    await user.click(nov);
    expect(nov).toHaveAttribute("aria-pressed", "false");
  });
});

describe("sending", () => {
  it("uploads the photos, then adds the place, then says thank you", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/Description/), "A quiet pond");
    await user.click(document.querySelector('[data-month="10"]') as HTMLElement);
    await user.click(document.querySelector('[data-month="11"]') as HTMLElement);
    await user.type(screen.getByLabelText(/Entry fee, Cambodians/), "4000");
    await user.type(screen.getByLabelText(/Entry fee, foreigners/), "2.5");
    await user.type(screen.getByLabelText(/What to bring/), "Shoes and water");
    await user.click(screen.getByRole("button", { name: "Send place" }));

    expect(await screen.findByRole("heading", { name: "Thank you!" })).toBeInTheDocument();
    expect(screen.getByText("Your place was sent. An admin will check it before it appears.")).toBeInTheDocument();

    // Order of events: ask for an upload link, upload to R2, then create the place.
    expect(calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST /api/v1/uploads/image",
      "PUT https://r2.example.com/put",
      "POST /api/v1/places",
    ]);
    expect(callsTo("/api/v1/uploads/image")[0].body).toEqual({ contentType: "image/webp", size: expect.any(Number) });
    expect(callsTo("/api/v1/places").find((c) => c.method === "POST")!.body).toEqual({
      name: "Hidden Pond",
      provinceSlug: "pursat",
      categorySlug: "waterfalls",
      lat: 12.5,
      lng: 103.9,
      photos: ["https://photos.example.com/places/1/x.webp"],
      description: "A quiet pond",
      bestMonths: [10, 11],
      entryFeeKhr: 4000,
      entryFeeUsd: 2.5,
      whatToBring: "Shoes and water",
      allowDuplicate: false,
    });
  });

  it("says the place is live when an admin added it", async () => {
    responses.create = () => json(201, { data: { id: 5, slug: "hidden-pond", status: "published" } });
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Send place" }));
    expect(await screen.findByText("Your place is live.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the place" })).toHaveAttribute("href", "/places/hidden-pond");
  });

  it("can start another place after sending one", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Send place" }));
    await user.click(await screen.findByRole("button", { name: "Add another place" }));
    expect(screen.getByLabelText("2. Name of the place")).toHaveValue("");
    expect(screen.queryByTestId("photo-thumb")).not.toBeInTheDocument();
  });

  it("warns about a place that may already exist, and adds it anyway when asked, without uploading again", async () => {
    let attempt = 0;
    responses.create = () =>
      ++attempt === 1
        ? json(409, { error: { code: "possible_duplicate", message: "x", details: { slug: "angkor-wat", name: { en: "Angkor Wat", km: "អង្គរវត្ត" } } } })
        : json(201, { data: { id: 5, slug: "angkor-cafe", status: "pending" } });
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Send place" }));

    expect(await screen.findByText("A place like this may already exist")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Angkor Wat" })).toHaveAttribute("href", "/places/angkor-wat");

    await user.click(screen.getByRole("button", { name: "Mine is different, add it anyway" }));
    expect(await screen.findByRole("heading", { name: "Thank you!" })).toBeInTheDocument();
    const posts = callsTo("/api/v1/places").filter((c) => c.method === "POST");
    expect(posts.map((c) => (c.body as { allowDuplicate: boolean }).allowDuplicate)).toEqual([false, true]);
    expect(callsTo("/api/v1/uploads/image")).toHaveLength(1);
  });

  it.each([
    ["too many places", () => json(429, { error: { code: "rate_limited", message: "x" } }), "You added several places in a short time. Please try again later."],
    ["a login that ran out", () => json(401, { error: { code: "unauthorized", message: "x" } }), "Please log in again to send your place."],
    ["a server problem", () => json(500, { error: { code: "internal_error", message: "x" } }), "We could not send your place. Please try again."],
  ])("explains %s and keeps what was typed", async (_name, response, message) => {
    responses.create = response;
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Send place" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("2. Name of the place")).toHaveValue("Hidden Pond");
    expect(screen.getAllByTestId("photo-thumb")).toHaveLength(1);
  });

  it("explains when photo storage is not set up", async () => {
    responses.upload = () => json(503, { error: { code: "uploads_not_configured", message: "x" } });
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Send place" }));
    expect(await screen.findByText("Photo uploads are not set up yet. Please try again later.")).toBeInTheDocument();
    expect(callsTo("/api/v1/places").filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("explains a photo that failed to upload", async () => {
    responses.put = () => new Response(null, { status: 403 });
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Send place" }));
    expect(await screen.findByText(/A photo could not be uploaded/)).toBeInTheDocument();
    expect(callsTo("/api/v1/places").filter((c) => c.method === "POST")).toHaveLength(0);
  });
});

describe("draft on this phone", () => {
  it("saves the text a moment after typing, and brings it back later", async () => {
    const user = userEvent.setup();
    const first = renderForm();
    await user.type(screen.getByLabelText("2. Name of the place"), "Hidden Pond");
    await user.selectOptions(screen.getByLabelText("3. Province"), "pursat");
    expect(await screen.findByText("Draft saved on this phone")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("tostov:add-place-draft:v1")!)).toMatchObject({
      name: "Hidden Pond",
      provinceSlug: "pursat",
    });

    first.unmount();
    renderForm();
    await waitFor(() => expect(screen.getByLabelText("2. Name of the place")).toHaveValue("Hidden Pond"));
    expect(screen.getByLabelText("3. Province")).toHaveValue("pursat");
  });

  it("removes the draft once the place is sent", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await screen.findByText("Draft saved on this phone");
    await user.click(screen.getByRole("button", { name: "Send place" }));
    await screen.findByRole("heading", { name: "Thank you!" });
    expect(window.localStorage.getItem("tostov:add-place-draft:v1")).toBeNull();
  });

  it("works even when the browser blocks storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("2. Name of the place"), "Hidden Pond");
    expect(screen.getByLabelText("2. Name of the place")).toHaveValue("Hidden Pond");
    vi.restoreAllMocks();
  });
});

describe("search before adding", () => {
  it("shows places with a similar name or near the pin", async () => {
    responses.search = () =>
      json(200, { data: [{ id: 9, slug: "bou-sra-waterfall", name: { en: "Bou Sra Waterfall", km: "ទឹកធ្លាក់ប៊ូស្រា" }, province: { id: 1, slug: "mondulkiri", name: { en: "Mondulkiri", km: "មណ្ឌលគិរី" } } }] });
    responses.nearby = () =>
      json(200, { data: [{ distanceMeters: 120, place: { id: 3, slug: "angkor-wat", name: { en: "Angkor Wat", km: "អង្គរវត្ត" }, province: { id: 2, slug: "siem-reap", name: { en: "Siem Reap", km: "សៀមរាប" } } } }] });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("2. Name of the place"), "Bou Sra");
    await user.click(screen.getByRole("button", { name: "tap map" }));

    const section = await screen.findByRole("region", { name: "Is it one of these?" }, { timeout: 3000 });
    const items = within(section).getAllByTestId("similar-place");
    expect(items).toHaveLength(2);
    // Nearest first, then name matches.
    expect(items[0]).toHaveTextContent("Angkor Wat");
    expect(items[0]).toHaveTextContent("120 m away");
    expect(items[1]).toHaveTextContent("Bou Sra Waterfall");
    expect(within(items[0]).getByRole("link")).toHaveAttribute("target", "_blank");
    expect(within(items[0]).getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("stays quiet when nothing matches", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("2. Name of the place"), "Hidden Pond");
    await waitFor(() => expect(callsTo("/api/v1/places?q=")).toHaveLength(1), { timeout: 3000 });
    expect(screen.queryByRole("region", { name: "Is it one of these?" })).not.toBeInTheDocument();
  });

  it("does not search for names shorter than 3 letters", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("2. Name of the place"), "Bo");
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(callsTo("/api/v1/places?q=")).toHaveLength(0);
  });
});
