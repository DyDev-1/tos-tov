import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SharePostForm } from "@/components/share/share-post-form";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { todayInCambodia } from "@/lib/dates";
import { pickText } from "@/lib/i18n-content";
import { getPlaceBySlug } from "@/lib/services/places";

// Share a post (an experience). Opened from a place page as /share?place=bou-sra-waterfall,
// or on its own, where the first step is to find the place.
export default async function SharePage({ params, searchParams }: PageProps<"/[locale]/share">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations({ locale, namespace: "Share" });
  const query = await searchParams;
  const slug = typeof query.place === "string" ? query.place : undefined;

  // A place picked on the place page. An unknown slug is simply ignored.
  const place = slug ? await getPlaceBySlug(slug).catch(() => null) : null;
  const preselected = place
    ? { slug: place.slug, name: pickText(place.name, locale) ?? place.slug, province: pickText(place.province.name, locale) ?? "" }
    : null;

  return (
    <main className="mx-auto w-full max-w-[45rem] flex-1 px-4 py-6 sm:py-10">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-5xl">{t("title")}</h1>
        <Link
          href={preselected ? `/places/${preselected.slug}` : "/"}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-primary px-5 font-semibold text-primary hover:bg-secondary"
        >
          {(await getTranslations({ locale, namespace: "AddPlace" }))("cancel")}
        </Link>
      </div>
      <p className="mt-2 mb-8 text-muted-foreground">{t("intro")}</p>
      <SharePostForm preselected={preselected} today={todayInCambodia()} />
    </main>
  );
}
