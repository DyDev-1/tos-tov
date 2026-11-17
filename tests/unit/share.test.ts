import { describe, expect, it } from "vitest";
import { absoluteUrl, facebookShareUrl, telegramShareUrl } from "@/lib/share";

const PAGE = "https://tostov.example.com/en/places/bou-sra-waterfall#post-3";

describe("facebookShareUrl", () => {
  it("opens Facebook's share window with the page address safely encoded", () => {
    const url = new URL(facebookShareUrl(PAGE));
    expect(url.origin + url.pathname).toBe("https://www.facebook.com/sharer/sharer.php");
    expect(url.searchParams.get("u")).toBe(PAGE);
  });
});

describe("telegramShareUrl", () => {
  it("opens Telegram's share window with the address and a text", () => {
    const url = new URL(telegramShareUrl(PAGE, "Bou Sra Waterfall"));
    expect(url.origin + url.pathname).toBe("https://t.me/share/url");
    expect(url.searchParams.get("url")).toBe(PAGE);
    expect(url.searchParams.get("text")).toBe("Bou Sra Waterfall");
  });

  it("keeps Khmer text and special characters intact", () => {
    const url = new URL(telegramShareUrl(PAGE, "ទឹកធ្លាក់ប៊ូស្រា & more?"));
    expect(url.searchParams.get("text")).toBe("ទឹកធ្លាក់ប៊ូស្រា & more?");
  });

  it("works without a text", () => {
    expect(new URL(telegramShareUrl(PAGE)).searchParams.has("text")).toBe(false);
  });
});

describe("absoluteUrl", () => {
  it("builds a full address from a path and the site's origin", () => {
    expect(absoluteUrl("/en/places/x#post-1", "https://tostov.example.com")).toBe("https://tostov.example.com/en/places/x#post-1");
    expect(absoluteUrl("/km", "http://localhost:3000")).toBe("http://localhost:3000/km");
  });
});
