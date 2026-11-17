import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense, use } from "react";
import { ExploreSection, ExploreSectionSkeleton } from "@/components/home/explore-section";
import type { Locale } from "@/i18n/routing";

// Home page. Built up slice by slice: provinces + categories now; search, season and place cards later.
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = use(params).locale as Locale;
  setRequestLocale(locale);
  const t = useTranslations();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-6 sm:py-10">
      <header>
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-5xl">{t("Home.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("Home.subtitle")}</p>
      </header>
      <Suspense fallback={<ExploreSectionSkeleton locale={locale} />}>
        <ExploreSection locale={locale} />
      </Suspense>
    </main>
  );
}
