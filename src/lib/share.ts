// Addresses for sharing a page. Plain functions, so they are easy to test.
// "Facebook" and "Telegram" open their own share windows with the page address filled in.

export function facebookShareUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

export function telegramShareUrl(pageUrl: string, text?: string): string {
  const params = new URLSearchParams({ url: pageUrl });
  if (text) params.set("text", text);
  return `https://t.me/share/url?${params.toString()}`;
}

// Turn "/en/places/bou-sra#post-3" into a full address, using the site's address (or the browser's).
export function absoluteUrl(path: string, origin: string): string {
  return new URL(path, origin).toString();
}
