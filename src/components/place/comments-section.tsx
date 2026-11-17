"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/client-api";
import { useFeature } from "@/components/shell/features-provider";
import { timeAgo } from "@/lib/dates";
import type { Comment } from "@/lib/validation/engagement";

// Comments: newest first, a box to share a tip, and "Show more comments".
// Posting needs login. New comments appear at once without reloading the page.
export function CommentsSection({
  slug,
  initialComments,
  total: initialTotal,
}: {
  slug: string;
  initialComments: Comment[];
  total: number;
}) {
  const t = useTranslations("Place.commentsSection");
  const locale = useLocale() as Locale;
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const commenting = useFeature("comment");
  const [items, setItems] = useState(initialComments);
  const [total, setTotal] = useState(initialTotal);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "posting" | "error" | "rate_limited">("idle");
  const [loadingMore, setLoadingMore] = useState(false);

  async function post(event: React.FormEvent) {
    event.preventDefault();
    if (!isSignedIn) return clerk.openSignIn();
    if (!body.trim()) return;
    setStatus("posting");
    const result = await apiFetch<Comment>(`/api/v1/places/${slug}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    if (result.ok) {
      setItems((list) => [result.data, ...list]);
      setTotal((n) => n + 1);
      setBody("");
      setStatus("idle");
    } else {
      setStatus(result.code === "rate_limited" ? "rate_limited" : "error");
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    const result = await apiFetch<Comment[]>(`/api/v1/places/${slug}/comments?limit=20&offset=${items.length}`);
    if (result.ok) setItems((list) => [...list, ...result.data.filter((c) => !list.some((x) => x.id === c.id))]);
    setLoadingMore(false);
  }

  return (
    <section id="comments" aria-labelledby="comments-heading" className="scroll-mt-24">
      <h2 id="comments-heading" className="font-heading text-xl font-bold sm:text-2xl">
        {t("title")}
      </h2>

      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-secondary p-4 text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60">
          {items.map((comment) => (
            <li key={comment.id} data-testid="comment" className="py-4">
              <p>
                <span className="font-semibold">{comment.author.name}</span>
                <span className="text-sm text-muted-foreground"> · {timeAgo(comment.createdAt, locale)}</span>
              </p>
              <p className="mt-1 break-words whitespace-pre-line">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      {items.length < total && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-2 min-h-11 font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60"
        >
          {t("loadMore")}
        </button>
      )}

      {commenting.ready && !commenting.allowed && (
        <p className="mt-4 rounded-2xl bg-secondary p-4 text-muted-foreground">{t("closed")}</p>
      )}
      {commenting.allowed && (
      <form onSubmit={post} className="mt-4 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("label")}</span>
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1000}
            placeholder={isSignedIn ? t("placeholder") : t("logIn")}
            className="min-h-12 w-full rounded-full border-2 border-border bg-card px-5 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={status === "posting"}
          className="min-h-12 shrink-0 rounded-full bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {status === "posting" ? t("posting") : t("post")}
        </button>
      </form>
      )}
      {(status === "error" || status === "rate_limited") && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {status === "rate_limited" ? t("rateLimited") : t("error")}
        </p>
      )}
    </section>
  );
}
