import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

// Warm tints from uxui.md, used when a place has no photo yet.
export const TINTS = ["bg-tint-clay", "bg-tint-sage", "bg-tint-moss", "bg-tint-sand"] as const;

type Props = {
  photo: { url: string; alt: string | null } | null;
  placeId: number;
  categorySlug: string;
  /** Text for screen readers. Decorative when the photo only repeats the place name. */
  alt?: string;
  className?: string;
};

// A place photo, or a tinted block with the category icon when there is none.
// Photos load lazily, and are already small WebP files (see the upload rules).
export function PlacePhoto({ photo, placeId, categorySlug, alt = "", className }: Props) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- images are resized to WebP on upload and served from R2
      <img
        src={photo.url}
        alt={photo.alt ?? alt}
        loading="lazy"
        decoding="async"
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <div aria-hidden className={cn("grid place-items-center", TINTS[placeId % TINTS.length], className)}>
      <CategoryIcon slug={categorySlug} className="size-1/4 text-primary/25" strokeWidth={1.25} />
    </div>
  );
}
