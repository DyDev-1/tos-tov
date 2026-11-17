"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ITEMS = [
  ["/admin", "overview"],
  ["/admin/places", "places"],
  ["/admin/posts", "posts"],
  ["/admin/comments", "comments"],
  ["/admin/reports", "reports"],
  ["/admin/categories", "categories"],
  ["/admin/users", "users"],
  ["/admin/log", "log"],
] as const;

// Admin menu: a row of pills that scrolls sideways on a phone.
export function AdminNav() {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        {ITEMS.map(([href, key]) => {
          // "/admin" is only the overview itself; the other items also match their sub-pages.
          const active = href === "/admin" ? pathname === "/admin" : isNavActive(pathname, href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 font-semibold transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70",
                )}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
