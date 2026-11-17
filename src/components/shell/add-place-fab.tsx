import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Floating laterite "Add a place" button. Sits above the tab bar on phone, bottom-right on desktop.
export function AddPlaceFab() {
  const t = useTranslations("Shell");

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
