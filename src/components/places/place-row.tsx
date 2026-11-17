import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pickText } from "@/lib/i18n-content";
import type { PlaceCard } from "@/lib/validation/places";
import { PlacePhoto } from "./place-photo";

// Compact row: small photo, name and a few lines. Used for "Recently added" and the map list.
export function PlaceRow({
  place,
  locale,
  lines,
}: {
  place: PlaceCard;
  locale: Locale;
  lines: string[];
}) {
  return (
    <Link
      href={`/places/${place.slug}`}
      data-testid="place-row"
      className="flex min-h-11 items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-secondary/60"
    >
      <PlacePhoto
        photo={place.coverPhoto}
        placeId={place.id}
        categorySlug={place.category.slug}
        className="size-20 shrink-0 rounded-2xl sm:size-24"
      />
      <div className="min-w-0">
        <p className="truncate font-heading font-bold">{pickText(place.name, locale)}</p>
        {lines.map((line, i) => (
          <p key={i} className="truncate text-sm text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </Link>
  );
}
