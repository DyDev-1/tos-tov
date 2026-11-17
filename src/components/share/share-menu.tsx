"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { absoluteUrl, facebookShareUrl, telegramShareUrl } from "@/lib/share";

// "Share" button with a small menu: Facebook, Telegram, copy the link, and the phone's own share sheet.
// `path` is the page to share, such as "/en/places/bou-sra-waterfall#post-3". The full address is made
// in the browser, so it is right on localhost, staging and production.
export function ShareMenu({ path, text }: { path: string; text: string }) {
  const t = useTranslations("ShareMenu");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState<"idle" | "yes" | "no">("idle");
  const [canShare, setCanShare] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Work out the full address when the menu opens (window only exists in the browser).
  function toggle() {
    if (!open) {
      setUrl(absoluteUrl(path, window.location.origin));
      setCanShare(typeof navigator.share === "function");
      setCopied("idle");
    }
    setOpen(!open);
  }

  // Close with Escape, or a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onClick = (event: MouseEvent) => root.current && !root.current.contains(event.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  }

  const item =
    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-semibold hover:bg-secondary focus-visible:bg-secondary";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="share-menu"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-border bg-card px-4 font-semibold hover:bg-secondary"
      >
        <Share2 aria-hidden className="size-4" />
        {t("button")}
      </button>
      {open && (
        <div
          id="share-menu"
          role="group"
          aria-label={t("title")}
          className="absolute left-0 z-50 mt-2 w-64 rounded-2xl border border-border bg-background p-2 shadow-xl"
        >
          <a
            href={facebookShareUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t("facebook")} (${t("opensNew")})`}
            className={item}
          >
            {t("facebook")}
          </a>
          <a
            href={telegramShareUrl(url, text)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t("telegram")} (${t("opensNew")})`}
            className={item}
          >
            {t("telegram")}
          </a>
          <button type="button" onClick={copy} className={item}>
            {copied === "yes" ? <Check aria-hidden className="size-4 text-primary" /> : <Link2 aria-hidden className="size-4" />}
            {copied === "yes" ? t("copied") : t("copy")}
          </button>
          {copied === "no" && (
            <p role="alert" className="px-3 pb-2 text-sm text-destructive">
              {t("copyFailed")}
            </p>
          )}
          {canShare && (
            <button
              type="button"
              onClick={() => navigator.share({ url, text }).catch(() => {})}
              className={item}
            >
              <Share2 aria-hidden className="size-4" />
              {t("native")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
