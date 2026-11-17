import type { Locale } from "@/i18n/routing";

const TIME_ZONE = "Asia/Phnom_Penh";

// Current month (1-12) in Cambodia, so "Best in November" is right even for visitors abroad.
export function currentMonth(now: Date = new Date()): number {
  const month = new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: TIME_ZONE }).format(now);
  return Number(month);
}

// Month name in the page language, e.g. "November" or "វិច្ឆិកា".
export function monthName(month: number, locale: Locale, style: "long" | "short" | "narrow" = "long"): string {
  return new Intl.DateTimeFormat(locale, { month: style, timeZone: "UTC" }).format(new Date(Date.UTC(2026, month - 1, 15)));
}

// "2 hours ago" / "yesterday" in the page language.
export function timeAgo(date: Date | string, locale: Locale, now: Date = new Date()): string {
  const seconds = Math.round((new Date(date).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(seconds / (86400 * 30)), "month");
  return rtf.format(Math.round(seconds / (86400 * 365)), "year");
}

// "3 November 2026" in the page language.
export function formatDate(date: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: TIME_ZONE }).format(new Date(date));
}
