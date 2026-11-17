"use client";

import { Bookmark, Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEngagement } from "./engagement-provider";

const PILL =
  "inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors";

export function LikeButton() {
  const t = useTranslations("Place");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { liked, likesCount, toggleLike } = useEngagement();

  return (
    <button
      type="button"
      onClick={toggleLike}
      aria-pressed={liked}
      aria-label={`${liked ? t("unlike") : t("like")} (${tc("likes", { count: likesCount })})`}
      className={cn(PILL, liked ? "border-laterite bg-laterite/10" : "border-border bg-card hover:bg-secondary")}
    >
      <Heart aria-hidden className={cn("size-4 text-laterite", liked && "fill-laterite")} />
      {new Intl.NumberFormat(locale).format(likesCount)}
    </button>
  );
}

// "pill" sits under the title. "overlay" is the round button on the photo (phone).
export function SaveButton({ variant = "pill" }: { variant?: "pill" | "overlay" }) {
  const t = useTranslations("Place");
  const { saved, toggleSave } = useEngagement();

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? t("saved") : t("save")}
        className="grid size-11 place-items-center rounded-full bg-background/95 text-primary shadow-md"
      >
        <Bookmark aria-hidden className={cn("size-5", saved && "fill-primary")} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggleSave}
      aria-pressed={saved}
      className={cn(PILL, saved ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary")}
    >
      <Bookmark aria-hidden className={cn("size-4", saved && "fill-primary")} />
      {saved ? t("saved") : t("save")}
    </button>
  );
}

export function ActionError() {
  const t = useTranslations("Place");
  const { error } = useEngagement();
  if (!error) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-destructive">
      {t("actionError")}
    </p>
  );
}
