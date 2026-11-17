"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isAuthPath } from "@/lib/nav";

// "Log in" on desktop. Signed-in users see their Clerk avatar menu instead (profile, sign out).
// This runs in the browser, so the pages around it can stay static and fast.
export function AuthButton() {
  const t = useTranslations("Header");
  const pathname = usePathname();
  if (isAuthPath(pathname)) return null;

  return (
    <div className="hidden md:block">
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 items-center rounded-full border border-primary px-5 font-semibold text-primary transition-colors hover:bg-secondary"
        >
          {t("logIn")}
        </Link>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
