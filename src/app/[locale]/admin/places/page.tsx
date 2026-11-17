import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pagination, SearchBox, StatusTabs } from "@/components/admin/list-controls";
import { PlacesAdminList } from "@/components/admin/lists";
import type { Locale } from "@/i18n/routing";
import { ADMIN_PAGE_SIZE, readAdminParams, requireAdminPage } from "@/lib/admin-page";
import { listAdminPlaces } from "@/lib/services/admin";

const STATUSES = ["pending", "published", "hidden"] as const;

export default async function AdminPlacesPage({ params, searchParams }: PageProps<"/[locale]/admin/places">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  await requireAdminPage(locale, "/admin/places");
  const t = await getTranslations({ locale, namespace: "Admin.places" });
  const { status, q, page, limit, offset } = readAdminParams(await searchParams, STATUSES);
  const { items, total } = await listAdminPlaces({ status, q, limit, offset });

  return (
    <main className="space-y-4">
      <h1 className="font-heading text-3xl font-bold text-primary">{t("title")}</h1>
      <StatusTabs pathname="/admin/places" statuses={STATUSES} current={status} q={q} allLabel />
      <SearchBox action={`/${locale}/admin/places`} q={q} status={status} placeholder={t("searchPlaceholder")} />
      <PlacesAdminList items={items} />
      <Pagination pathname="/admin/places" page={page} total={total} pageSize={ADMIN_PAGE_SIZE} query={{ status, q }} />
    </main>
  );
}
