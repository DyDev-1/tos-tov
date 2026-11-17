import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { PlaceCard, PlaceCardSkeleton } from "@/components/places/place-card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentMonth, monthName } from "@/lib/dates";
import { listPlaces } from "@/lib/services/places";
import { listPlacesQuerySchema } from "@/lib/validation/places";
import { SectionShell } from "./section-shell";

// "Best this month": the three most-liked places that are in season right now.
export async function BestThisMonth({ locale }: { locale: Locale }) {
  await connection();
  const t = await getTranslations({ locale, namespace: "Home.best" });
  const month = currentMonth();
  const subtitle = t("subtitle", { month: monthName(month, locale) });

  let items;
  try {
    ({ items } = await listPlaces(listPlacesQuerySchema.parse({ month, limit: 3, sort: "likes" })));
  } catch (error) {
    console.error("Home best-this-month failed", error);
    return (
      <SectionShell id="best" title={t("title")}>
        <ErrorBox message={t("error")} />
      </SectionShell>
    );
  }

  return (
    <SectionShell id="best" title={t("title")} subtitle={subtitle}>
      {items.length === 0 ? (
        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-muted-foreground">{t("empty")}</p>
          <Link href="/map" className="mt-2 inline-flex min-h-11 items-center font-semibold text-laterite hover:underline">
            {t("viewAll")}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {items.map((place) => (
            <li key={place.id}>
              <PlaceCard place={place} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

export async function BestThisMonthSkeleton({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Home.best" });
  return (
    <SectionShell id="best" title={t("title")}>
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <PlaceCardSkeleton />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

async function ErrorBox({ message }: { message: string }) {
  const t = await getTranslations("Common");
  return (
    <div role="alert" className="rounded-2xl bg-secondary p-4">
      <p>{message}</p>
      <Link href="/" className="mt-2 inline-flex min-h-11 items-center font-semibold text-laterite hover:underline">
        {t("retry")}
      </Link>
    </div>
  );
}
