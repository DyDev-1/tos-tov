import { Navigation } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CambodiaMap } from "@/components/map/cambodia-map";
import type { Locale } from "@/i18n/routing";
import { pickText } from "@/lib/i18n-content";
import type { PlaceDetail } from "@/lib/validation/places";

// Opens Google Maps with directions to the pin. CLAUDE.md: use a link, not Google's map API.
export function googleMapsDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export async function GettingThere({ place, locale }: { place: PlaceDetail; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Place.gettingThere" });
  const name = pickText(place.name, locale)!;
  const rows = (["nearestTown", "transport", "road"] as const)
    .map((key) => ({ key, value: pickText(place.details[key], locale) }))
    .filter((row) => row.value);

  return (
    <section aria-labelledby="getting-there" className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/60">
      <h2 id="getting-there" className="font-heading text-xl font-bold">
        {t("title")}
      </h2>
      <CambodiaMap
        label={t("mapLabel", { name })}
        markers={[{ id: place.id, lat: place.location.lat, lng: place.location.lng, title: name }]}
        selectedId={place.id}
        className="mt-4 h-48 overflow-hidden rounded-2xl"
      />
      {rows.length > 0 && (
        <dl className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t(row.key)}</dt>
              <dd className="text-right font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <a
        href={googleMapsDirectionsUrl(place.location.lat, place.location.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-laterite px-5 font-semibold text-laterite-foreground transition-colors hover:bg-laterite/90"
      >
        <Navigation aria-hidden className="size-4" />
        {t("openMaps")}
      </a>
    </section>
  );
}
