"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { monthName } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Twelve on/off buttons for "Best months to visit". Selected months are filled green (as on the place page).
export function MonthPicker({ value, onChange }: { value: number[]; onChange: (months: number[]) => void }) {
  const t = useTranslations("AddPlace");
  const locale = useLocale() as Locale;

  return (
    <fieldset>
      <legend className="mb-2 font-bold">
        {t("months.label")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const on = value.includes(month);
          return (
            <button
              key={month}
              type="button"
              aria-pressed={on}
              data-month={month}
              onClick={() => onChange(on ? value.filter((m) => m !== month) : [...value, month].sort((a, b) => a - b))}
              className={cn(
                "min-h-11 min-w-14 rounded-full border-2 px-3 font-semibold transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
              )}
            >
              {monthName(month, locale, "short")}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
