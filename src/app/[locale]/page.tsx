import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Link } from "@/i18n/navigation";

// Placeholder Home page. The real Home (search, season, provinces, cards) comes in a later slice.
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations();
  const otherLocale = locale === "km" ? "en" : "km";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex justify-end">
        <Link
          href="/"
          locale={otherLocale}
          className="inline-flex min-h-11 items-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground"
        >
          {t("Header.language")}
        </Link>
      </div>
      <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">{t("Home.title")}</h1>
      <p className="text-muted-foreground">{t("Home.subtitle")}</p>
    </main>
  );
}
