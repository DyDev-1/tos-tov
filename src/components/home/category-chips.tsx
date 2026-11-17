import { Map } from "lucide-react";
import { useTranslations } from "next-intl";
import { CategoryIcon } from "@/components/places/category-icon";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Category } from "@/lib/validation/reference";

type Props = { categories: Category[]; locale: Locale };

// Pill-shaped category chips. Each opens the Map page filtered to that category.
// They scroll sideways on phone. "See on map" sits at the end (right side on desktop).
export function CategoryChips({ categories, locale }: Props) {
  const t = useTranslations("Home.explore");

  return (
    <div className="flex items-center justify-between gap-4">
      <ul className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 sm:gap-3 md:mx-0 md:px-0">
        {categories.map((category) => (
          <li key={category.id} data-testid="category-chip" className="shrink-0">
            <Link
              href={{ pathname: "/map", query: { category: category.slug } }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
            >
              <CategoryIcon slug={category.slug} aria-hidden className="size-4" />
              {category.name[locale]}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/map"
        className="hidden min-h-11 shrink-0 items-center gap-2 rounded-full border-2 border-primary px-4 font-semibold text-primary transition-colors hover:bg-secondary md:inline-flex"
      >
        <Map aria-hidden className="size-4" />
        {t("seeOnMap")}
      </Link>
    </div>
  );
}

export function CategoryChipsSkeleton() {
  return (
    <ul aria-hidden className="-mx-4 flex gap-2 overflow-hidden px-4 pb-1 sm:gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="h-11 w-28 shrink-0 animate-pulse rounded-full bg-muted" />
      ))}
    </ul>
  );
}
