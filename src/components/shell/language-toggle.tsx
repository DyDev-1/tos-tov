"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALE_LABELS } from "@/i18n/labels";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// EN | ខ្មែរ pill. Each side is a normal link to the same page in the other language,
// so it works without JavaScript and search engines can follow it.
export function LanguageToggle() {
  const current = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Shell");

  return (
    <div role="group" aria-label={t("language")} className="inline-flex rounded-full bg-secondary p-0.5">
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            lang={locale}
            hrefLang={locale}
            aria-current={active ? "true" : undefined}
            aria-label={LOCALE_LABELS[locale].name}
            className={cn(
              "inline-flex min-h-11 min-w-12 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-background/60",
            )}
          >
            {LOCALE_LABELS[locale].short}
          </Link>
        );
      })}
    </div>
  );
}
