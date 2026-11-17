"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isAuthPath } from "@/lib/nav";
import { useMe } from "./features-provider";

// "Admin" in the header, shown only to admins. This is just a shortcut: showing or hiding it protects nothing.
// The admin pages and API routes check the role on the server every time.
export function AdminLink() {
  const t = useTranslations("Header");
  const { role, banned } = useMe();
  const pathname = usePathname();

  if (role !== "admin" || banned || isAuthPath(pathname)) return null;
  return (
    <Link
      href="/admin"
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 font-semibold text-primary hover:bg-secondary/70"
    >
      <ShieldCheck aria-hidden className="size-4" />
      {t("admin")}
    </Link>
  );
}
