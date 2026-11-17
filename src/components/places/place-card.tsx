import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pickText } from "@/lib/i18n-content";
import type { PlaceCard as PlaceCardData } from "@/lib/validation/places";
import { LikesPill } from "./likes-pill";
import { PlacePhoto } from "./place-photo";

// Big photo card used on Home ("Best this month"): photo, likes pill, name, "Province · tagline".
export function PlaceCard({ place, locale }: { place: PlaceCardData; locale: Locale }) {
  const name = pickText(place.name, locale)!;
  const subtitle = [pickText(place.province.name, locale), pickText(place.tagline, locale)].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/places/${place.slug}`}
      data-testid="place-card"
      className="group block overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative">
        <PlacePhoto
          photo={place.coverPhoto}
          placeId={place.id}
          categorySlug={place.category.slug}
          className="aspect-[4/3] w-full sm:aspect-[3/2]"
        />
        <div className="absolute top-3 right-3">
          <LikesPill count={place.likesCount} />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-heading text-lg font-bold group-hover:underline">{name}</h3>
        <p className="mt-0.5 text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}

export function PlaceCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-3xl bg-card ring-1 ring-border/60">
      <div className="aspect-[4/3] animate-pulse bg-muted sm:aspect-[3/2]" />
      <div className="space-y-2 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
