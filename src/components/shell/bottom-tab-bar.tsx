"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isAuthPath, isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

const TAB_CLASS =
  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-xs font-medium transition-colors";

// Phone navigation: Explore, Map, Saved, Profile. Hidden from tablet width up (the header takes over).
export function BottomTabBar() {
  const t = useTranslations();
  const pathname = usePathname();
  if (isAuthPath(pathname)) return null;

  return (
    <nav
      aria-label={t("Shell.tabBar")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 py-1.5">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(TAB_CLASS, active ? "bg-secondary text-primary" : "text-muted-foreground")}
              >
                <Icon aria-hidden className="size-5" />
                {t(`Header.${labelKey}`)}
              </Link>
            </li>
          );
        })}
        <li>
          <Show when="signed-out">
            <Link href="/sign-in" className={cn(TAB_CLASS, "text-muted-foreground")}>
              <User aria-hidden className="size-5" />
              {t("Shell.profile")}
            </Link>
          </Show>
          <Show when="signed-in">
            <div className={cn(TAB_CLASS, "text-muted-foreground")}>
              <UserButton />
              {t("Shell.profile")}
            </div>
          </Show>
        </li>
      </ul>
    </nav>
  );
}
