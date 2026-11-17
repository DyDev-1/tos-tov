import { defineRouting } from "next-intl/routing";

// The two interface languages. English is the default.
// URLs look like /en/... and /km/...
export const routing = defineRouting({
  locales: ["en", "km"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];
