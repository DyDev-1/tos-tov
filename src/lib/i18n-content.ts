import type { Locale } from "@/i18n/routing";

type Localized = { en?: string | null; km?: string | null } | null | undefined;

// Pick the text for the current language. If it is missing, fall back to the other language
// (a place added in English still shows up on the Khmer site).
export function pickText(value: Localized, locale: Locale): string | null {
  if (!value) return null;
  const other: Locale = locale === "km" ? "en" : "km";
  return value[locale]?.trim() || value[other]?.trim() || null;
}
