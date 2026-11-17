import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pagination, StatusTabs } from "@/components/admin/list-controls";
import { ReportsAdminList } from "@/components/admin/lists";
import type { Locale } from "@/i18n/routing";
import { ADMIN_PAGE_SIZE, readAdminParams, requireAdminPage } from "@/lib/admin-page";
import { listAdminReports } from "@/lib/services/admin";

const STATUSES = ["open", "resolved"] as const;

export default async function AdminReportsPage({ params, searchParams }: PageProps<"/[locale]/admin/reports">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  await requireAdminPage(locale, "/admin/reports");
  const t = await getTranslations({ locale, namespace: "Admin.reports" });
  const { status, q, page, limit, offset } = readAdminParams(await searchParams, STATUSES);
  const { items, total } = await listAdminReports({ status, q, limit, offset });

  return (
    <main className="space-y-4">
      <h1 className="font-heading text-3xl font-bold text-primary">{t("title")}</h1>
      <StatusTabs pathname="/admin/reports" statuses={STATUSES} current={status} q={q} allLabel />
      <ReportsAdminList items={items} />
      <Pagination pathname="/admin/reports" page={page} total={total} pageSize={ADMIN_PAGE_SIZE} query={{ status, q }} />
    </main>
  );
}
