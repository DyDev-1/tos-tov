"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/client-api";
import { pickText } from "@/lib/i18n-content";
import type { PlaceCard } from "@/lib/validation/places";
import type { Pin } from "./pin-picker";

type Match = { place: PlaceCard; distanceMeters: number | null };

// "Search first": while the person types a name or places the pin, show places that might be the same one.
// CLAUDE.md: search existing places (by name and by nearby map pin) before creating a new one.
export function SimilarPlaces({ name, pin }: { name: string; pin: Pin | null }) {
  const t = useTranslations("AddPlace.similar");
  const locale = useLocale() as Locale;
  const [matches, setMatches] = useState<Match[]>([]);

  const query = name.trim();
  const lat = pin?.lat;
  const lng = pin?.lng;

  useEffect(() => {
    const useName = query.length >= 3;
    if (!useName && lat === undefined) return;

    // Wait until the person stops typing or moving the pin (half a second), then look.
    let cancelled = false;
    const timer = setTimeout(async () => {
      const [byPlace, byName] = await Promise.all([
        lat !== undefined && lng !== undefined
          ? apiFetch<Match[]>(`/api/v1/places/nearby?lat=${lat}&lng=${lng}&radius=500&limit=3`)
          : null,
        useName ? apiFetch<PlaceCard[]>(`/api/v1/places?q=${encodeURIComponent(query)}&limit=3`) : null,
      ]);
      if (cancelled) return;
      const found = new Map<number, Match>();
      if (byPlace?.ok) for (const m of byPlace.data) found.set(m.place.id, m);
      if (byName?.ok) for (const place of byName.data) if (!found.has(place.id)) found.set(place.id, { place, distanceMeters: null });
      setMatches([...found.values()].slice(0, 3));
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, lat, lng]);

  if (matches.length === 0) return null;

  return (
    <section aria-label={t("title")} className="rounded-2xl bg-secondary p-4">
      <h3 className="font-heading font-bold">{t("title")}</h3>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
      <ul className="mt-3 space-y-2">
        {matches.map(({ place, distanceMeters }) => (
          <li key={place.id} data-testid="similar-place" className="flex items-center justify-between gap-3 rounded-xl bg-background p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{pickText(place.name, locale)}</p>
              <p className="truncate text-sm text-muted-foreground">
                {[pickText(place.province.name, locale), distanceMeters !== null ? t("away", { meters: distanceMeters }) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {/* New tab, so the form and its photos are not lost. */}
            <Link
              href={`/places/${place.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t("view")}: ${pickText(place.name, locale)} (${t("opensNew")})`}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-primary px-4 font-semibold text-primary hover:bg-secondary"
            >
              {t("view")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
