import { Droplets, Landmark, MapPin, Mountain, Soup, TreePalm, type LucideIcon } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import type { Category } from "@/lib/validation/reference";

// Icons belong to the UI, not the database, so they are matched by slug here.
// A new category without an icon gets a map pin.
const ICONS: Record<string, LucideIcon> = {
  temples: Landmark,
  waterfalls: Droplets,
  beaches: TreePalm,
  mountains: Mountain,
  food: Soup,
};

type Props = { categories: Category[]; locale: Locale };

// Pill-shaped category chips. Scroll sideways on phone, wrap into one row on desktop.
// Filtering by category arrives with the Places slice.
export function CategoryChips({ categories, locale }: Props) {
  return (
    <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:gap-3">
      {categories.map((category) => {
        const Icon = ICONS[category.slug] ?? MapPin;
        return (
          <li
            key={category.id}
            data-testid="category-chip"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-secondary px-4 font-medium text-secondary-foreground"
          >
            <Icon aria-hidden className="size-4" />
            {category.name[locale]}
          </li>
        );
      })}
    </ul>
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
