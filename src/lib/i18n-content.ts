import type { Locale } from "@/i18n/routing";

type Localized = { en?: string | null; km?: string | null } | null | undefined;

// Pick the text for the current language. If it is missing, fall back to the other language
// (a place added in English still shows up on the Khmer site).
export function pickText(value: Localized, locale: Locale): string | null {
  if (!value) return null;
  const other: Locale = locale === "km" ? "en" : "km";
  return value[locale]?.trim() || value[other]?.trim() || null;
}

// Text typed by a person is in one language. Khmer letters mean Khmer, anything else is treated as English.
// It is stored under that language, and `pickText` shows it on the other language's page too.
export function localizeInput(text: string | undefined): { en?: string; km?: string } | undefined {
  const value = text?.trim();
  if (!value) return undefined;
  return /[ក-៿]/.test(value) ? { km: value } : { en: value };
}

// "Bou Sra Waterfall!" -> "bou-sra-waterfall". Khmer-only names have no Latin letters, so they give "".
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
