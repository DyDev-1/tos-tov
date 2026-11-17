import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionError, LikeButton, SaveButton } from "@/components/place/action-buttons";
import { CommentsSection } from "@/components/place/comments-section";
import { EngagementProvider } from "@/components/place/engagement-provider";
import { FactCard } from "@/components/place/fact-card";
import { GettingThere } from "@/components/place/getting-there";
import { GuidesCard } from "@/components/place/guides-card";
import { MonthStrip } from "@/components/place/month-strip";
import { PlaceGallery } from "@/components/place/place-gallery";
import { ReportProblem } from "@/components/place/report-problem";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentMonth, formatDate, monthName } from "@/lib/dates";
import { pickText } from "@/lib/i18n-content";
import { SITE_NAME } from "@/lib/site";
import { listComments } from "@/lib/services/engagement";
import { getPlaceBySlug } from "@/lib/services/places";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/places/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const place = await getPlaceBySlug(slug).catch(() => null);
  if (!place) return {};
  return {
    title: `${pickText(place.name, locale as Locale)} | ${SITE_NAME}`,
    description: pickText(place.tagline, locale as Locale) ?? pickText(place.description, locale as Locale) ?? undefined,
  };
}

function formatKhr(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "KHR", maximumFractionDigits: 0 }).format(amount);
}
function formatUsd(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(amount);
}

const TAG = "inline-flex min-h-8 items-center rounded-full bg-secondary px-3 text-sm font-semibold";

export default async function PlacePage({ params }: PageProps<"/[locale]/places/[slug]">) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  await connection();

  const place = await getPlaceBySlug(slug);
  if (!place) notFound();
  const comments = (await listComments(slug, { limit: 20, offset: 0 })) ?? { items: [], total: 0 };

  const t = await getTranslations({ locale, namespace: "Place" });
  const month = currentMonth();
  const inSeason = place.bestMonths.includes(month);
  const name = pickText(place.name, locale)!;
  const provinceName = pickText(place.province.name, locale)!;
  const categoryName = pickText(place.category.name, locale)!;
  const description = pickText(place.description, locale);

  const detail = (key: keyof typeof place.details) => pickText(place.details[key], locale);
  const needCards = (
    [
      ["ticket", "need.ticket"],
      ["dressCode", "need.dressCode"],
      ["whatToBring", "need.whatToBring"],
      ["difficulty", "need.difficulty"],
    ] as const
  )
    .map(([key, label]) => ({ key, label: t(label), value: detail(key) }))
    .filter((card) => card.value);
  const practicalCards = (
    [
      ["openingHours", "practical.openingHours"],
      ["timeNeeded", "practical.timeNeeded"],
      ["facilities", "practical.facilities"],
    ] as const
  )
    .map(([key, label]) => ({ key, label: t(label), value: detail(key) }))
    .filter((card) => card.value);

  const avoidNote =
    detail("avoidNote") ??
    (place.avoidMonths.length > 0
      ? t("season.avoidDefault", { months: place.avoidMonths.map((m) => monthName(m, locale)).join(", ") })
      : null);

  const { khr, usd } = place.entryFee;
  const feeLines = [
    khr !== null && `${t("need.cambodians")}: ${khr === 0 ? t("need.free") : formatKhr(khr, locale)}`,
    usd !== null && `${t("need.foreigners")}: ${usd === 0 ? t("need.free") : formatUsd(usd, locale)}`,
  ].filter(Boolean) as string[];

  const heading = "font-heading text-xl font-bold sm:text-2xl";

  return (
    <EngagementProvider slug={place.slug} initialLikesCount={place.likesCount}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 md:pt-4">
        <nav aria-label={t("breadcrumb")} className="mb-4 hidden md:block">
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            <li>
              <Link href="/" className="font-semibold text-laterite hover:underline">
                {t("explore")}
              </Link>
            </li>
            <li aria-hidden className="text-muted-foreground">/</li>
            <li>
              <Link
                href={{ pathname: "/map", query: { province: place.province.slug } }}
                className="font-semibold text-laterite hover:underline"
              >
                {provinceName}
              </Link>
            </li>
            <li aria-hidden className="text-muted-foreground">/</li>
            <li aria-current="page" className="text-muted-foreground">
              {categoryName}
            </li>
          </ol>
        </nav>

        <PlaceGallery place={place} locale={locale} />

        {/*
          Two columns on desktop. On phone the wrappers use "display: contents", so every section
          becomes a direct child of the flex column and the "order-N" classes decide the order:
          "Getting there" comes right after the description, as in the phone design.
        */}
        <div className="mt-6 flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-10">
          <div className="contents lg:block lg:space-y-8">
            <header className="order-1">
              <div className="flex flex-wrap gap-2">
                <Link href={{ pathname: "/map", query: { category: place.category.slug } }} className={TAG}>
                  {categoryName}
                </Link>
                <Link href={{ pathname: "/map", query: { province: place.province.slug } }} className={TAG}>
                  {provinceName}
                </Link>
                {inSeason && <span className={cn(TAG, "bg-primary text-primary-foreground")}>{t("inSeason")}</span>}
              </div>
              <h1 className="mt-3 font-heading text-3xl font-bold text-primary sm:text-5xl">{name}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <LikeButton />
                <SaveButton />
                <a
                  href="#comments"
                  className="inline-flex min-h-11 items-center rounded-full border-2 border-border bg-card px-4 font-semibold hover:bg-secondary"
                >
                  {t("comments", { count: comments.total })}
                </a>
              </div>
              <ActionError />
              {description && <p className="mt-4 max-w-2xl text-lg leading-relaxed">{description}</p>}
            </header>

            <section aria-labelledby="need" className="order-3">
              <h2 id="need" className={heading}>
                {t("need.title")}
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <FactCard label={t("need.entryFee")}>
                  {feeLines.length > 0 ? (
                    feeLines.map((line) => <span key={line} className="block">{line}</span>)
                  ) : (
                    <span className="font-normal text-muted-foreground">{t("need.notListed")}</span>
                  )}
                </FactCard>
                {needCards.map((card) => (
                  <FactCard key={card.key} label={card.label}>
                    {card.value}
                  </FactCard>
                ))}
              </dl>
            </section>

            <section aria-labelledby="season" className="order-4">
              <h2 id="season" className={heading}>
                {t("season.title")}
              </h2>
              <div className="mt-4">
                {place.bestMonths.length === 0 && place.avoidMonths.length === 0 ? (
                  <p className="rounded-2xl bg-secondary p-4 text-muted-foreground">{t("season.none")}</p>
                ) : (
                  <MonthStrip
                    bestMonths={place.bestMonths}
                    avoidMonths={place.avoidMonths}
                    currentMonth={month}
                    locale={locale}
                  />
                )}
                {avoidNote && (
                  <p className="mt-4 rounded-2xl bg-laterite/10 p-4 text-laterite">{avoidNote}</p>
                )}
              </div>
            </section>

            {practicalCards.length > 0 && (
              <section aria-labelledby="practical" className="order-5">
                <h2 id="practical" className={heading}>
                  {t("practical.title")}
                </h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {practicalCards.map((card) => (
                    <FactCard key={card.key} label={card.label} variant="outline">
                      {card.value}
                    </FactCard>
                  ))}
                </dl>
              </section>
            )}

            <div className="order-7">
              <CommentsSection slug={place.slug} initialComments={comments.items} total={comments.total} />
            </div>
          </div>

          <aside className="contents lg:block lg:space-y-6">
            <div className="order-2">
              <GettingThere place={place} locale={locale} />
            </div>
            <div className="order-6">
              <GuidesCard guides={place.guides} locale={locale} />
            </div>
            <div className="order-8 space-y-1 px-1">
              {place.addedBy && (
                <p className="text-muted-foreground">{t("trust.postedBy", { name: place.addedBy })}</p>
              )}
              <p className="text-muted-foreground">{t("trust.lastUpdated", { date: formatDate(place.updatedAt, locale) })}</p>
              <div className="pt-2">
                <ReportProblem slug={place.slug} />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </EngagementProvider>
  );
}
