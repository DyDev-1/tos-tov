// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareMenu } from "@/components/share/share-menu";
import messages from "../../messages/en.json";

const renderMenu = () =>
  render(
    <NextIntlClientProvider locale="en" messages={messages} onError={(error) => { throw error; }}>
      <ShareMenu path="/en/places/bou-sra-waterfall#post-3" text="Bou Sra Waterfall" />
    </NextIntlClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ShareMenu", () => {
  it("starts closed and opens with the Share button", async () => {
    const user = userEvent.setup();
    renderMenu();
    expect(screen.queryByRole("link", { name: /Facebook/ })).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Share" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /Facebook/ })).toBeVisible();
  });

  it("links to Facebook and Telegram with the full page address, in a new tab", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Share" }));

    const page = `${window.location.origin}/en/places/bou-sra-waterfall#post-3`;
    const facebook = screen.getByRole("link", { name: /Facebook/ });
    expect(new URL(facebook.getAttribute("href")!).searchParams.get("u")).toBe(page);
    const telegram = screen.getByRole("link", { name: /Telegram/ });
    expect(new URL(telegram.getAttribute("href")!).searchParams.get("url")).toBe(page);
    expect(new URL(telegram.getAttribute("href")!).searchParams.get("text")).toBe("Bou Sra Waterfall");
    for (const link of [facebook, telegram]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("copies the link and says so", async () => {
    const user = userEvent.setup();
    // The test tool installs its own clipboard when set up, so ours goes in afterwards.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/en/places/bou-sra-waterfall#post-3`);
    expect(await screen.findByText("Link copied")).toBeVisible();
  });

  it("explains when copying is not allowed", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not copy");
  });

  it("offers the phone's own share sheet only when the browser has one", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.click(screen.getByRole("button", { name: "More options…" }));
    expect(share).toHaveBeenCalledWith({ url: `${window.location.origin}/en/places/bou-sra-waterfall#post-3`, text: "Bou Sra Waterfall" });
  });

  it("hides the phone share option when the browser cannot share", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", { ...navigator, share: undefined });
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.queryByRole("button", { name: "More options…" })).not.toBeInTheDocument();
  });

  it("closes with Escape and when clicking elsewhere", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: /Facebook/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.click(document.body);
    expect(screen.queryByRole("link", { name: /Facebook/ })).not.toBeInTheDocument();
  });
});
