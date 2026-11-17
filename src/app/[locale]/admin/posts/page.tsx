import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pagination, StatusTabs } from "@/components/admin/list-controls";
import { PostsAdminList } from "@/components/admin/lists";
import type { Locale } from "@/i18n/routing";
import { ADMIN_PAGE_SIZE, readAdminParams, requireAdminPage } from "@/lib/admin-page";
import { listAdminPosts } from "@/lib/services/admin";

const STATUSES = ["pending", "published", "hidden"] as const;

export default async function AdminPostsPage({ params, searchParams }: PageProps<"/[locale]/admin/posts">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  await requireAdminPage(locale, "/admin/posts");
  const t = await getTranslations({ locale, namespace: "Admin.posts" });
  const { status, q, page, limit, offset } = readAdminParams(await searchParams, STATUSES);
  const { items, total } = await listAdminPosts({ status, q, limit, offset });

  return (
    <main className="space-y-4">
      <h1 className="font-heading text-3xl font-bold text-primary">{t("title")}</h1>
      <StatusTabs pathname="/admin/posts" statuses={STATUSES} current={status} q={q} allLabel />
      <PostsAdminList items={items} />
      <Pagination pathname="/admin/posts" page={page} total={total} pageSize={ADMIN_PAGE_SIZE} query={{ status, q }} />
    </main>
  );
}
