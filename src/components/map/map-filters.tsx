"use client";

import { ChevronDown, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { monthName } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Category, Province } from "@/lib/validation/reference";

export type MapFilterValues = { q?: string; province?: string; category?: string; month?: number };

const SELECT =
  "min-h-11 w-full cursor-pointer appearance-none rounded-full border-2 bg-card pl-4 pr-10 font-semibold transition-colors";

// Province, category and season filters. Changing one updates the page address
// (/map?province=kampot&month=11), so a filtered map can be shared or bookmarked.
export function MapFilters({
  provinces,
  categories,
  values,
}: {
  provinces: Province[];
  categories: Category[];
  values: MapFilterValues;
}) {
  const t = useTranslations("Map");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(change: Partial<Record<keyof MapFilterValues, string | undefined>>) {
    const next: Record<string, string> = {};
    const merged = { ...values, month: values.month?.toString(), ...change };
    for (const [key, value] of Object.entries(merged)) if (value) next[key] = String(value);
    startTransition(() => router.replace({ pathname: "/map", query: next }, { scroll: false }));
  }

  const select = (
    label: string,
    key: "province" | "category" | "month",
    current: string | undefined,
    options: { value: string; label: string }[],
    all: string,
  ) => (
    <label className="relative block min-w-44 shrink-0 sm:min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={current ?? ""}
        onChange={(event) => update({ [key]: event.target.value || undefined })}
        className={cn(SELECT, current ? "border-primary bg-secondary" : "border-border")}
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2" />
    </label>
  );

  return (
    <div
      className={cn("flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible", pending && "opacity-70")}
      role="group"
      aria-label={t("title")}
    >
      {select(
        t("provinceLabel"),
        "province",
        values.province,
        provinces.map((p) => ({ value: p.slug, label: p.name[locale] })),
        t("allProvinces"),
      )}
      {select(
        t("categoryLabel"),
        "category",
        values.category,
        categories.map((c) => ({ value: c.slug, label: c.name[locale] })),
        t("allCategories"),
      )}
      {select(
        t("seasonLabel"),
        "month",
        values.month?.toString(),
        Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
          value: String(m),
          label: t("bestIn", { month: monthName(m, locale) }),
        })),
        t("anySeason"),
      )}
      {values.q && (
        <button
          type="button"
          onClick={() => update({ q: undefined })}
          aria-label={t("removeSearch")}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 border-primary bg-secondary px-4 font-semibold"
        >
          {t("searchChip", { q: values.q })}
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
