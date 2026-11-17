import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { currentMonth, monthName } from "@/lib/dates";

// Search by name + season. A plain form (works without JavaScript): it opens the Map page,
// which shows the matching places as a list and as pins.
export async function SearchBar({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Home.search" });
  const now = currentMonth();

  return (
    <form
      action={`/${locale}/map`}
      role="search"
      aria-label={t("label")}
      className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2 md:rounded-full md:border-2 md:border-primary md:bg-card md:p-2 md:shadow-sm"
    >
      <label className="flex min-h-12 flex-1 items-center gap-3 rounded-full border-2 border-primary bg-card px-4 md:min-h-11 md:border-0 md:px-3">
        <Search aria-hidden className="size-5 shrink-0 text-primary" />
        <span className="sr-only">{t("label")}</span>
        <input
          type="search"
          name="q"
          maxLength={100}
          placeholder={t("placeholder")}
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>
      <label className="relative">
        <span className="sr-only">{t("season")}</span>
        <select
          name="month"
          defaultValue={String(now)}
          className="min-h-12 w-full cursor-pointer appearance-none rounded-full bg-secondary px-4 pr-10 font-semibold md:min-h-11 md:w-auto"
        >
          <option value="">{t("anySeason")}</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <option key={month} value={month}>
              {t("bestIn", { month: monthName(month, locale) })}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-primary">
          ▾
        </span>
      </label>
      <button
        type="submit"
        className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:min-h-11"
      >
        {t("button")}
      </button>
    </form>
  );
}
