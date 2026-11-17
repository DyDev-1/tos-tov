import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OverviewCards } from "@/components/admin/lists";
import type { Locale } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/admin-page";
import { getAdminOverview } from "@/lib/services/admin";

export default async function AdminHomePage({ params }: PageProps<"/[locale]/admin">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  await requireAdminPage(locale, "/admin");
  const t = await getTranslations({ locale, namespace: "Admin.overview" });
  const data = await getAdminOverview();

  return (
    <main className="space-y-6">
      <h1 className="font-heading text-3xl font-bold text-primary">{t("title")}</h1>
      <OverviewCards data={data} />
    </main>
  );
}
