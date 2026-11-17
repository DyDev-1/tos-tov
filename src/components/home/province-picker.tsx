import type { Locale } from "@/i18n/routing";
import type { Province } from "@/lib/validation/reference";

const TINTS = ["bg-tint-clay", "bg-tint-sage", "bg-tint-moss", "bg-tint-sand"];

type Props = { provinces: Province[]; locale: Locale };

// Row of province cards. Scrolls sideways (with snapping), like the Home design on phone and desktop.
// The name in the current language comes first, the other language underneath.
export function ProvincePicker({ provinces, locale }: Props) {
  const other: Locale = locale === "km" ? "en" : "km";

  return (
    <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:gap-5">
      {provinces.map((province, i) => (
        <li key={province.id} className="w-30 shrink-0 snap-start sm:w-52" data-testid="province-card">
          <div
            aria-hidden
            className={`h-30 rounded-2xl sm:h-40 ${TINTS[i % TINTS.length]}`}
          />
          <p className="mt-2 font-medium leading-tight">{province.name[locale]}</p>
          <p className="text-sm text-muted-foreground" lang={other}>
            {province.name[other]}
          </p>
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
