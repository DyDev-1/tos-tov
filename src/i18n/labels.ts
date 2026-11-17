import type { Locale } from "./routing";

// Each language is written in its own language, so people can always find theirs.
// These are names, not interface text, so they do not go in the messages files.
export const LOCALE_LABELS: Record<Locale, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  km: { short: "ខ្មែរ", name: "ភាសាខ្មែរ" },
};
