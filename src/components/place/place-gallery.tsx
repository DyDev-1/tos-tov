import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PlacePhoto } from "@/components/places/place-photo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pickText } from "@/lib/i18n-content";
import type { PlaceDetail } from "@/lib/validation/places";
import { SaveButton } from "./action-buttons";

// Photos at the top. Desktop: one big photo and two small ones ("+5 photos" on the last).
// Phone: one full-width photo with Back and Save buttons on top of it.
export async function PlaceGallery({ place, locale }: { place: PlaceDetail; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Place" });
  const name = pickText(place.name, locale)!;
  const slots = [0, 1, 2].map((i) => place.photos[i] ?? null);
  const extra = place.photos.length - 3;

  return (
    <div className="relative -mx-4 md:mx-0">
      <div className="grid gap-3 md:h-[26rem] md:grid-cols-[2fr_1fr] md:grid-rows-2">
        <PlacePhoto
          photo={slots[0]}
          placeId={place.id}
          categorySlug={place.category.slug}
          alt={name}
          className="aspect-[4/3] w-full md:row-span-2 md:aspect-auto md:h-full md:rounded-3xl"
        />
        {[1, 2].map((i) => (
          <div key={i} className="relative hidden md:block">
            <PlacePhoto
              photo={slots[i]}
              placeId={place.id + i}
              categorySlug={place.category.slug}
              alt={name}
              className="h-full w-full rounded-3xl"
            />
            {i === 2 && extra > 0 && (
              <span className="absolute top-3 right-3 rounded-full bg-background/90 px-3 py-1 text-sm font-semibold">
                {t("morePhotos", { count: extra })}
              </span>
            )}
          </div>
        ))}
      </div>

      {place.photos.length > 0 && (
        <span className="absolute right-4 bottom-3 rounded-full bg-background/90 px-3 py-1 text-sm font-semibold md:hidden">
          {t("photoCount", { count: place.photos.length })}
        </span>
      )}
      {place.photos.length === 0 && (
        <span className="absolute bottom-3 left-4 rounded-full bg-background/90 px-3 py-1 text-sm text-muted-foreground md:left-4">
          {t("noPhotos")}
        </span>
      )}

      {/* Phone only: Back and Save on the photo. */}
      <div className="absolute inset-x-4 top-3 flex items-center justify-between md:hidden">
        <Link
          href="/"
          aria-label={t("back")}
          className="grid size-11 place-items-center rounded-full bg-background/95 text-primary shadow-md"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <SaveButton variant="overlay" />
      </div>
    </div>
  );
}
