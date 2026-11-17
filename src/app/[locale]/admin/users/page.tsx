import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pagination, SearchBox, StatusTabs } from "@/components/admin/list-controls";
import { UsersAdminList } from "@/components/admin/lists";
import type { Locale } from "@/i18n/routing";
import { ADMIN_PAGE_SIZE, readAdminParams, requireAdminPage } from "@/lib/admin-page";
import { listAdminUsers } from "@/lib/services/admin";

const STATUSES = ["banned"] as const;

export default async function AdminUsersPage({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  await requireAdminPage(locale, "/admin/users");
  const t = await getTranslations({ locale, namespace: "Admin.users" });
  const { status, q, page, limit, offset } = readAdminParams(await searchParams, STATUSES);
  const { items, total } = await listAdminUsers({ status, q, limit, offset });

  return (
    <main className="space-y-4">
      <h1 className="font-heading text-3xl font-bold text-primary">{t("title")}</h1>
      <StatusTabs pathname="/admin/users" statuses={STATUSES} current={status} q={q} allLabel />
      <SearchBox action={`/${locale}/admin/users`} q={q} status={status} placeholder={t("searchPlaceholder")} />
      <UsersAdminList items={items} />
      <Pagination pathname="/admin/users" page={page} total={total} pageSize={ADMIN_PAGE_SIZE} query={{ status, q }} />
    </main>
  );
}
