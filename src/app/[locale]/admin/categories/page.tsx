import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryManager } from "@/components/admin/category-manager";
import type { Locale } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/admin-page";
import { listAdminCategories } from "@/lib/services/admin";

export default async function AdminCategoriesPage({ params }: PageProps<"/[locale]/admin/categories">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await connection();
  await requireAdminPage(locale, "/admin/categories");
  const t = await getTranslations({ locale, namespace: "Admin.categories" });
  const categories = await listAdminCategories();

  return (
    <main className="space-y-4">
      <h1 className="font-heading text-3xl font-bold text-primary">{t("title")}</h1>
      <CategoryManager categories={categories} />
    </main>
  );
}
