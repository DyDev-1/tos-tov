import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Empty state for pages that are designed but not built yet (Map, Saved, Add a place).
export async function ComingSoon({ title }: { title: string }) {
  const t = await getTranslations("Shell");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-4 px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">{title}</h1>
      <div className="w-full max-w-xl rounded-2xl bg-secondary p-6">
        <p className="font-medium">{t("comingSoon")}</p>
        <p className="mt-1 text-muted-foreground">{t("comingSoonBody")}</p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center font-semibold text-laterite underline-offset-4 hover:underline"
        >
          {t("backHome")}
        </Link>
      </div>
    </main>
  );
}
