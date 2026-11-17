"use client";

import { List, Map as MapIcon, Navigation } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { googleMapsDirectionsUrl } from "@/components/place/getting-there";
import { PlacePhoto } from "@/components/places/place-photo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pickText } from "@/lib/i18n-content";
import type { PlaceCard } from "@/lib/validation/places";
import { cn } from "@/lib/utils";
import { CambodiaMap } from "./cambodia-map";

// The Map view: results list on the left and the map on the right (desktop),
// or the map full width with a "Show list" button (phone). The selected place has an
// orange pin, an outline in the list, and a card with "View place" and "Directions".
export function MapExplorer({ places, month }: { places: PlaceCard[]; month: number }) {
  const t = useTranslations("Map");
  const tc = useTranslations("Common");
  const locale = useLocale() as Locale;
  const [selectedId, setSelectedId] = useState<number | null>(places[0]?.id ?? null);
  const [phoneView, setPhoneView] = useState<"map" | "list">("map");

  // If the filters change and the selected place is gone, fall back to the first result.
  const selected = places.find((p) => p.id === selectedId) ?? places[0] ?? null;
  const markers = useMemo(
    () =>
      places.map((p) => ({ id: p.id, lat: p.location.lat, lng: p.location.lng, title: pickText(p.name, locale)! })),
    [places, locale],
  );

  const showingList = phoneView === "list";

  return (
    <div className="grid gap-4 lg:h-[calc(100dvh-11rem)] lg:min-h-[30rem] lg:grid-cols-[minmax(20rem,32%)_1fr]">
      <ul
        aria-label={t("listLabel")}
        className={cn("space-y-1 lg:block lg:overflow-y-auto lg:pr-1", showingList ? "block" : "hidden")}
      >
        {places.map((place) => {
          const active = place.id === selected?.id;
          return (
            <li key={place.id}>
              <button
                type="button"
                data-testid="map-list-item"
                aria-pressed={active}
                onClick={() => setSelectedId(place.id)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors",
                  active ? "bg-card ring-2 ring-primary" : "hover:bg-secondary/60",
                )}
              >
                <PlacePhoto
                  photo={place.coverPhoto}
                  placeId={place.id}
                  categorySlug={place.category.slug}
                  className="size-20 shrink-0 rounded-2xl"
                />
                <span className="min-w-0">
                  <span className="block truncate font-heading text-lg font-bold">{pickText(place.name, locale)}</span>
                  <span className="block truncate text-muted-foreground">
                    {pickText(place.province.name, locale)} · {pickText(place.category.name, locale)}
                  </span>
                  <span className="block text-sm text-muted-foreground">{tc("likes", { count: place.likesCount })}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        className={cn(
          "relative isolate h-[calc(100dvh-17rem)] min-h-[22rem] lg:block lg:h-auto",
          showingList ? "hidden" : "block",
        )}
      >
        <CambodiaMap
          label={t("mapLabel")}
          markers={markers}
          selectedId={selected?.id ?? null}
          onSelect={(id) => setSelectedId(Number(id))}
          fit
          className="absolute inset-0 overflow-hidden rounded-3xl"
        />

        <button
          type="button"
          onClick={() => setPhoneView("list")}
          className="absolute bottom-40 left-1/2 z-[500] inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-background px-5 font-semibold text-primary shadow-lg lg:hidden"
        >
          <List aria-hidden className="size-4" />
          {t("showList", { count: places.length })}
        </button>

        {selected && (
          <div
            aria-label={t("selectedPlace")}
            role="group"
            className="absolute inset-x-3 bottom-3 z-[500] rounded-3xl bg-background p-4 shadow-xl lg:inset-x-auto lg:right-4 lg:bottom-4 lg:w-80"
          >
            <div className="flex items-center gap-3">
              <PlacePhoto
                photo={selected.coverPhoto}
                placeId={selected.id}
                categorySlug={selected.category.slug}
                className="size-16 shrink-0 rounded-2xl lg:hidden"
              />
              <div className="min-w-0">
                <p className="truncate font-heading text-lg font-bold">{pickText(selected.name, locale)}</p>
                <p className="truncate text-muted-foreground">
                  {[
                    pickText(selected.province.name, locale),
                    selected.bestMonths.includes(month) ? t("inSeason") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={`/places/${selected.slug}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t("viewPlace")}
              </Link>
              <a
                href={googleMapsDirectionsUrl(selected.location.lat, selected.location.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 border-primary px-4 font-semibold text-primary hover:bg-secondary"
              >
                <Navigation aria-hidden className="size-4" />
                {t("directions")}
              </a>
            </div>
          </div>
        )}

      </div>

      {showingList && (
        <button
          type="button"
          onClick={() => setPhoneView("map")}
          className="fixed bottom-24 left-1/2 z-40 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-lg lg:hidden"
        >
          <MapIcon aria-hidden className="size-4" />
          {t("showMap")}
        </button>
      )}
    </div>
  );
}
