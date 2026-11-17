"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

// Explore / Map / Saved links in the desktop header. The current page gets a sand pill.
export function MainNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav aria-label={t("Shell.mainNav")} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, labelKey }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 font-medium transition-colors",
                  active ? "bg-secondary text-primary" : "text-foreground hover:bg-secondary/60",
                )}
              >
                {t(`Header.${labelKey}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
