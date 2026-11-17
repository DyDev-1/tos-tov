"use client";

import { useLocale, useTranslations } from "next-intl";
import { ShareMenu } from "@/components/share/share-menu";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/dates";
import type { Post } from "@/lib/validation/posts";
import { Stars } from "./stars";

// One person's experience: who, when they visited, stars, story and photos.
export function PostCard({ post, placePath, placeName }: { post: Post; placePath: string; placeName: string }) {
  const t = useTranslations("Posts");
  const locale = useLocale() as Locale;

  return (
    <article id={`post-${post.id}`} data-testid="post" className="scroll-mt-24 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{post.author.name}</p>
          <p className="text-sm text-muted-foreground">{t("visited", { date: formatDate(`${post.visitedAt}T12:00:00Z`, locale) })}</p>
        </div>
        <Stars value={post.rating} label={t("ratedAria", { rating: post.rating })} />
      </div>
      <p className="mt-3 break-words whitespace-pre-line">{post.story}</p>
      {post.photos.length > 0 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto">
          {post.photos.map((photo) => (
            <li key={photo.url} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- already small WebP files from our own storage */}
              <img
                src={photo.url}
                alt={t("photoAlt", { name: post.author.name })}
                loading="lazy"
                decoding="async"
                className="size-28 rounded-2xl object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <ShareMenu path={`${placePath}#post-${post.id}`} text={placeName} />
      </div>
    </article>
  );
}
