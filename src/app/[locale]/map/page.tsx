import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapExplorer } from "@/components/map/map-explorer";
import { MapFilters, type MapFilterValues } from "@/components/map/map-filters";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentMonth } from "@/lib/dates";
import { listPlaces } from "@/lib/services/places";
import { listCategories, listProvinces } from "@/lib/services/reference";
import { listPlacesQuerySchema } from "@/lib/validation/places";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;

// Map view: filter by province, category and season. Filters live in the address (?province=...&month=...).
export default async function MapPage({ params, searchParams }: PageProps<"/[locale]/map">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations({ locale, namespace: "Map" });
  const query = await searchParams;

  // Ignore filters that are not valid (for example ?month=99) instead of showing an error.
  const parsed = listPlacesQuerySchema.safeParse({
    q: first(query.q),
    province: first(query.province),
    category: first(query.category),
    month: first(query.month),
    sort: "likes",
    limit: 200,
  });
  const filters = parsed.success ? parsed.data : listPlacesQuerySchema.parse({ limit: 200 });
  const values: MapFilterValues = {
    q: filters.q,
    province: filters.province,
    category: filters.category,
    month: filters.month,
  };

  let data;
  try {
    const [result, provinces, categories] = await Promise.all([listPlaces(filters), listProvinces(), listCategories()]);
    data = { ...result, provinces, categories };
  } catch (error) {
    console.error("Map page failed", error);
  }

  return (
    <main className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-4 px-4 py-4">
      <h1 className="sr-only">{t("title")}</h1>
      {!data ? (
        <div role="alert" className="max-w-xl rounded-2xl bg-secondary p-6">
          <p>{t("error")}</p>
          <Link href="/map" className="mt-3 inline-flex min-h-11 items-center font-semibold text-laterite hover:underline">
            {(await getTranslations({ locale, namespace: "Common" }))("retry")}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <MapFilters provinces={data.provinces} categories={data.categories} values={values} />
            <p role="status" className="shrink-0 text-muted-foreground">
              {t("count", { count: data.total })}
            </p>
          </div>
          {data.items.length === 0 ? (
            <div className="max-w-xl rounded-2xl bg-secondary p-6">
              <p>{t("empty")}</p>
              <Link href="/map" className="mt-3 inline-flex min-h-11 items-center font-semibold text-laterite hover:underline">
                {t("clear")}
              </Link>
            </div>
          ) : (
            // `key` resets the selection whenever the filters change.
            <MapExplorer key={JSON.stringify(values)} places={data.items} month={currentMonth()} />
          )}
        </>
      )}
    </main>
  );
}
