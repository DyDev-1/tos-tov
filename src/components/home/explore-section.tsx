import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { listCategories, listProvinces } from "@/lib/services/reference";
import { CategoryChips, CategoryChipsSkeleton } from "./category-chips";
import { ProvincePicker, ProvincePickerSkeleton } from "./province-picker";

// "Explore by province" + category chips. Loads its data on the server for each request,
// and shows its own empty and error states so the rest of the page still works.
export async function ExploreSection({ locale }: { locale: Locale }) {
  // Read the database at request time, not at build time (the build has no database).
  await connection();
  const t = await getTranslations({ locale, namespace: "Home.explore" });

  let data;
  try {
    data = await Promise.all([listProvinces(), listCategories()]);
  } catch (error) {
    console.error("Home explore section failed", error);
    return (
      <SectionShell title={t("provincesTitle")}>
        <div role="alert" className="rounded-2xl bg-secondary p-4">
          <p>{t("error")}</p>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-11 items-center font-medium text-laterite underline-offset-4 hover:underline"
          >
            {t("retry")}
          </Link>
        </div>
      </SectionShell>
    );
  }

  const [provinces, categories] = data;

  return (
    <SectionShell title={t("provincesTitle")}>
      {provinces.length === 0 ? (
        <p className="rounded-2xl bg-secondary p-4 text-muted-foreground">{t("empty")}</p>
      ) : (
        <ProvincePicker provinces={provinces} locale={locale} />
      )}
      {categories.length > 0 && (
        <nav aria-label={t("categoriesLabel")} className="mt-6">
          <CategoryChips categories={categories} locale={locale} />
        </nav>
      )}
    </SectionShell>
  );
}

// Shown while ExploreSection loads (React Suspense fallback).
export async function ExploreSectionSkeleton({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Home.explore" });
  return (
    <SectionShell title={t("provincesTitle")}>
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <ProvincePickerSkeleton />
      <div className="mt-6">
        <CategoryChipsSkeleton />
      </div>
    </SectionShell>
  );
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="explore-provinces">
      <h2 id="explore-provinces" className="mb-4 font-heading text-xl font-bold sm:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}
