import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddPlaceForm } from "@/components/add-place/add-place-form";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getReleaseStage, stageAllows } from "@/lib/release-stage";
import { listCategories, listProvinces } from "@/lib/services/reference";

// Add a place: one column, 720 px wide on desktop. Needs login (the form shows a login prompt otherwise,
// and the API checks it again on the server).
export default async function AddPlacePage({ params }: PageProps<"/[locale]/add-place">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations({ locale, namespace: "AddPlace" });
  const tc = await getTranslations({ locale, namespace: "Common" });

  let lists;
  try {
    const [provinces, categories] = await Promise.all([listProvinces(), listCategories()]);
    lists = { provinces, categories };
  } catch (error) {
    console.error("Add place page failed", error);
  }

  return (
    <main className="mx-auto w-full max-w-[45rem] flex-1 px-4 py-6 sm:py-10">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-5xl">{t("title")}</h1>
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-primary px-5 font-semibold text-primary hover:bg-secondary"
        >
          {t("cancel")}
        </Link>
      </div>
      <p className="mt-2 text-muted-foreground">{t("intro")}</p>
      {stageAllows(getReleaseStage(), "sharePost") ? (
        <Link href="/share" className="mt-2 mb-8 inline-flex min-h-11 items-center font-semibold text-laterite underline-offset-4 hover:underline">
          {t("linkToShare")}
        </Link>
      ) : (
        <div className="mb-8" />
      )}
      {lists ? (
        <AddPlaceForm provinces={lists.provinces} categories={lists.categories} />
      ) : (
        <div role="alert" className="rounded-2xl bg-secondary p-6">
          <p>{tc("error")}</p>
          <Link href="/add-place" className="mt-3 inline-flex min-h-11 items-center font-semibold text-laterite hover:underline">
            {tc("retry")}
          </Link>
        </div>
      )}
    </main>
  );
}
