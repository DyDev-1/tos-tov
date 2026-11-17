import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import type { Province } from "@/lib/validation/reference";

const TINTS = ["bg-tint-clay", "bg-tint-sage", "bg-tint-moss", "bg-tint-sand"];

type Props = { provinces: Province[]; locale: Locale; layout?: "row" | "grid" };

// Province cards that open the Map page filtered to that province.
// "row": one line that scrolls sideways (Home). "grid": wraps onto several lines (All provinces page).
// The name in the current language comes first, the other language underneath.
export function ProvincePicker({ provinces, locale, layout = "row" }: Props) {
  const other: Locale = locale === "km" ? "en" : "km";

  return (
    <ul
      className={cn(
        layout === "row"
          ? "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:gap-5"
          : "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
      )}
    >
      {provinces.map((province, i) => (
        <li
          key={province.id}
          className={cn(layout === "row" && "w-30 shrink-0 snap-start sm:w-52")}
          data-testid="province-card"
        >
          <Link
            href={{ pathname: "/map", query: { province: province.slug } }}
            className="group block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div
              aria-hidden
              className={cn(
                "rounded-2xl transition-transform group-hover:scale-[1.02]",
                layout === "row" ? "h-30 sm:h-40" : "aspect-[4/3]",
                TINTS[i % TINTS.length],
              )}
            />
            <p className="mt-2 font-medium leading-tight group-hover:underline">{province.name[locale]}</p>
            <p className="text-sm text-muted-foreground" lang={other}>
              {province.name[other]}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ProvincePickerSkeleton() {
  return (
    <ul aria-hidden className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2 sm:gap-5">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="w-30 shrink-0 sm:w-52">
          <div className="h-30 animate-pulse rounded-2xl bg-muted sm:h-40" />
          <div className="mt-2 h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-3 w-14 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}
