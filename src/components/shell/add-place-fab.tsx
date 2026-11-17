"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isAuthPath, isNavActive } from "@/lib/nav";
import { useFeature } from "./features-provider";

// Floating laterite "Add a place" button. Sits above the tab bar on phone, bottom-right on desktop.
// Hidden where it would get in the way: on the map (it covers the place card) and on the form itself.
export function AddPlaceFab() {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  // Not shown until adding places is open (release stage 3), except to admins.
  const { allowed } = useFeature("addPlace");
  if (!allowed) return null;
  if (isNavActive(pathname, "/map") || isNavActive(pathname, "/add-place") || isNavActive(pathname, "/share") || isAuthPath(pathname)) return null;

  return (
    <Link
      href="/add-place"
      className="fixed right-4 bottom-24 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-laterite px-5 font-semibold text-laterite-foreground shadow-lg shadow-black/15 transition-transform hover:scale-[1.02] md:right-6 md:bottom-6"
    >
      <Plus aria-hidden className="size-5" />
      {t("addPlace")}
    </Link>
  );
}
