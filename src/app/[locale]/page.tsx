import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense, use } from "react";
import { BestThisMonth, BestThisMonthSkeleton } from "@/components/home/best-this-month";
import { ExploreSection, ExploreSectionSkeleton } from "@/components/home/explore-section";
import { RecentlyAdded, RecentlyAddedSkeleton } from "@/components/home/recently-added";
import { SearchBar } from "@/components/home/search-bar";
import type { Locale } from "@/i18n/routing";

// Home. Goal: get the visitor to open a place within 10 seconds.
// Each section loads on its own, so a slow or failing part never blocks the rest.
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = use(params).locale as Locale;
  setRequestLocale(locale);
  const t = useTranslations("Home");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-6 sm:py-10">
      <header>
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-5xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-6 max-w-4xl">
          <SearchBar locale={locale} />
        </div>
      </header>
      <Suspense fallback={<ExploreSectionSkeleton locale={locale} />}>
        <ExploreSection locale={locale} />
      </Suspense>
      <Suspense fallback={<BestThisMonthSkeleton locale={locale} />}>
        <BestThisMonth locale={locale} />
      </Suspense>
      <Suspense fallback={<RecentlyAddedSkeleton locale={locale} />}>
        <RecentlyAdded locale={locale} />
      </Suspense>
    </main>
  );
}
