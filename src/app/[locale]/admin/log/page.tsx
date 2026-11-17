import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pagination } from "@/components/admin/list-controls";
import { LogList } from "@/components/admin/lists";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ADMIN_PAGE_SIZE, readAdminParams, requireAdminPage } from "@/lib/admin-page";
import { listAuditLog } from "@/lib/services/admin";

export default async function AdminLogPage({ params, searchParams }: PageProps<"/[locale]/admin/log">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  await requireAdminPage(locale, "/admin/log");
  const t = await getTranslations({ locale, namespace: "Admin.log" });
  const query = await searchParams;
  const { page, limit, offset } = readAdminParams(query, []);
  const type = typeof query.type === "string" ? query.type.slice(0, 30) : undefined;
  const id = Number(typeof query.id === "string" ? query.id : "");
  const targetId = Number.isInteger(id) && id > 0 ? id : undefined;
  const { items, total } = await listAuditLog({ limit, offset, targetType: type, targetId });

  return (
    <main className="space-y-4">
      <h1 className="font-heading text-3xl font-bold text-primary">{t("title")}</h1>
      {type && targetId !== undefined && (
        <p className="flex flex-wrap items-center gap-3 rounded-2xl bg-secondary p-4">
          {t("filtered", { type, id: targetId })}
          <Link href="/admin/log" className="font-semibold text-laterite hover:underline">
            {t("showAll")}
          </Link>
        </p>
      )}
      <LogList items={items} />
      <Pagination
        pathname="/admin/log"
        page={page}
        total={total}
        pageSize={ADMIN_PAGE_SIZE}
        query={{ type, id: targetId !== undefined ? String(targetId) : undefined }}
      />
    </main>
  );
}
