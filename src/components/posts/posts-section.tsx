"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/client-api";
import type { Post, RatingSummary } from "@/lib/validation/posts";
import { PostCard } from "./post-card";
import { Stars } from "./stars";

// "Experiences": the average rating, the newest posts, "Show more", and a button to share your own.
export function PostsSection({
  slug,
  placeName,
  rating,
  initialPosts,
  total,
}: {
  slug: string;
  placeName: string;
  rating: RatingSummary;
  initialPosts: Post[];
  total: number;
}) {
  const t = useTranslations("Posts");
  const locale = useLocale();
  const [items, setItems] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function loadMore() {
    setLoading(true);
    setFailed(false);
    const result = await apiFetch<Post[]>(`/api/v1/places/${slug}/posts?limit=5&offset=${items.length}`);
    if (result.ok) setItems((list) => [...list, ...result.data.filter((p) => !list.some((x) => x.id === p.id))]);
    else setFailed(true);
    setLoading(false);
  }

  return (
    <section id="posts" aria-labelledby="posts-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="posts-heading" className="font-heading text-xl font-bold sm:text-2xl">
            {t("title")}
          </h2>
          {rating.average !== null ? (
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <Stars value={rating.average} label={t("ratedAria", { rating: rating.average })} />
              <span>{t("ratingSummary", { average: rating.average, count: rating.count })}</span>
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">{t("noRating")}</p>
          )}
        </div>
        <Link
          href={{ pathname: "/share", query: { place: slug } }}
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t("share")}
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-secondary p-4 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-2 divide-y divide-border/60">
          {items.map((post) => (
            <PostCard key={post.id} post={post} placePath={`/${locale}/places/${slug}`} placeName={placeName} />
          ))}
        </div>
      )}

      {items.length < total && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-2 min-h-11 font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60"
        >
          {t("loadMore")}
        </button>
      )}
      {failed && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {t("error")}
        </p>
      )}
    </section>
  );
}
