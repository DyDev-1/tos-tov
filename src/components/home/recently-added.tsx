import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { PlaceRow } from "@/components/places/place-row";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { timeAgo } from "@/lib/dates";
import { getReleaseStage, stageAllows } from "@/lib/release-stage";
import { pickText } from "@/lib/i18n-content";
import { listPlaces } from "@/lib/services/places";
import { listPlacesQuerySchema } from "@/lib/validation/places";
import { SectionShell } from "./section-shell";

// "Recently added by the community": the four newest places.
export async function RecentlyAdded({ locale }: { locale: Locale }) {
  await connection();
  const t = await getTranslations({ locale, namespace: "Home.recent" });

  let items;
  try {
    ({ items } = await listPlaces(listPlacesQuerySchema.parse({ limit: 4, sort: "recent" })));
  } catch (error) {
    console.error("Home recently-added failed", error);
    return (
      <SectionShell id="recent" title={t("title")}>
        <div role="alert" className="rounded-2xl bg-secondary p-4">
          <p>{t("error")}</p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id="recent" title={t("title")}>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-secondary p-4 text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <ul className="grid gap-x-8 divide-y divide-border/60 md:grid-cols-2 md:divide-y-0">
            {items.map((place) => {
              const when = timeAgo(place.createdAt, locale);
              return (
                <li key={place.id} className="md:border-b md:border-border/60">
                  <PlaceRow
                    place={place}
                    locale={locale}
                    lines={[
                      `${pickText(place.province.name, locale)} · ${pickText(place.category.name, locale)}`,
                      place.addedBy ? t("addedBy", { name: place.addedBy, time: when }) : t("addedByUnknown", { time: when }),
                    ]}
                  />
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <Link
              href="/map"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-primary px-6 font-semibold text-primary transition-colors hover:bg-secondary md:w-auto"
            >
              {t("seeMore")}
            </Link>
            {stageAllows(getReleaseStage(), "sharePost") && (
            <Link
              href="/share"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:w-auto"
            >
              {t("share")}
            </Link>
            )}
          </div>
        </>
      )}
    </SectionShell>
  );
}

export async function RecentlyAddedSkeleton({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Home.recent" });
  return (
    <SectionShell id="recent" title={t("title")}>
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <ul aria-hidden className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-4 p-3">
            <div className="size-20 animate-pulse rounded-2xl bg-muted sm:size-24" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
