import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProvincePicker } from "@/components/home/province-picker";
import type { Locale } from "@/i18n/routing";
import { listProvinces } from "@/lib/services/reference";

// All 25 provinces. Each opens the Map page filtered to that province.
export default async function ProvincesPage({ params }: PageProps<"/[locale]/provinces">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations({ locale, namespace: "Provinces" });
  const tc = await getTranslations({ locale, namespace: "Common" });

  let provinces;
  try {
    provinces = await listProvinces();
  } catch (error) {
    console.error("Provinces page failed", error);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header>
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </header>
      {!provinces ? (
        <p role="alert" className="rounded-2xl bg-secondary p-4">
          {tc("error")}
        </p>
      ) : (
        <ProvincePicker provinces={provinces} locale={locale} layout="grid" />
      )}
    </main>
  );
}
