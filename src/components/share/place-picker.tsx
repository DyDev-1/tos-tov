"use client";

import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/client-api";
import { pickText } from "@/lib/i18n-content";
import type { PlaceCard } from "@/lib/validation/places";

export type PickedPlace = { slug: string; name: string; province: string };

// Step 1 of sharing a post: find the place. CLAUDE.md: search existing places first, and only add a
// new one when none matches ("Not on the list? Add a new place").
export function PlacePicker({
  selected,
  onSelect,
  error,
}: {
  selected: PickedPlace | null;
  onSelect: (place: PickedPlace | null) => void;
  error?: string;
}) {
  const t = useTranslations("Share.place");
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceCard[] | null>(null);
  const [searching, setSearching] = useState(false);

  const text = query.trim();
  useEffect(() => {
    if (text.length < 2) return;
    let cancelled = false;
    // Wait until the person stops typing (half a second), then search.
    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await apiFetch<PlaceCard[]>(`/api/v1/places?q=${encodeURIComponent(text)}&limit=5`);
      if (cancelled) return;
      setSearching(false);
      setResults(result.ok ? result.data : []);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);

  if (selected) {
    return (
      <fieldset className="space-y-2">
        <legend className="mb-2 font-bold">{t("label")}</legend>
        <div aria-label={t("selected")} role="group" className="flex items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
          <div className="min-w-0">
            <p data-testid="selected-place" className="truncate font-heading text-lg font-bold">
              {selected.name}
            </p>
            <p className="truncate text-muted-foreground">{selected.province}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery("");
              setResults(null);
            }}
            className="min-h-11 shrink-0 rounded-full border-2 border-primary px-4 font-semibold text-primary hover:bg-background"
          >
            {t("change")}
          </button>
        </div>
      </fieldset>
    );
  }

  const shown = text.length >= 2 ? results : null;

  return (
    <fieldset aria-invalid={!!error} className="space-y-3">
      <legend className="mb-2 font-bold">{t("label")}</legend>
      <label className="flex min-h-12 items-center gap-3 rounded-full border-2 border-border bg-card px-4 focus-within:border-primary">
        <Search aria-hidden className="size-5 shrink-0 text-primary" />
        <span className="sr-only">{t("searchLabel")}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("placeholder")}
          maxLength={100}
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>
      {searching && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("searching")}
        </p>
      )}
      {shown && shown.length > 0 && (
        <ul aria-label={t("results")} className="space-y-1">
          {shown.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                data-testid="place-result"
                aria-label={t("choose", { name: pickText(place.name, locale) ?? place.slug })}
                onClick={() =>
                  onSelect({
                    slug: place.slug,
                    name: pickText(place.name, locale) ?? place.slug,
                    province: pickText(place.province.name, locale) ?? "",
                  })
                }
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl p-3 text-left hover:bg-secondary"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{pickText(place.name, locale)}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {pickText(place.province.name, locale)} · {pickText(place.category.name, locale)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {shown && shown.length === 0 && !searching && <p className="text-muted-foreground">{t("noResults")}</p>}
      <Link href="/add-place" className="inline-flex min-h-11 items-center font-semibold text-laterite underline-offset-4 hover:underline">
        {t("addNew")}
      </Link>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
