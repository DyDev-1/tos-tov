import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNav } from "@/components/admin/admin-nav";
import type { Locale } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/admin-page";

// The admin area. This layout gives the menu and checks the role once for a fast redirect,
// but EVERY admin page checks the role again (see requireAdminPage).
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireAdminPage(locale, "/admin");
  const t = await getTranslations({ locale, namespace: "Admin" });

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <p className="mb-2 font-semibold text-laterite">{t("title")}</p>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
