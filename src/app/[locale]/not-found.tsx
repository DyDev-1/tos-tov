import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Shown for an unknown page or place (404).
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-4 px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">{t("title")}</h1>
      <div className="w-full max-w-xl rounded-2xl bg-secondary p-6">
        <p className="text-muted-foreground">{t("body")}</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center font-semibold text-laterite hover:underline">
          {t("back")}
        </Link>
      </div>
    </main>
  );
}
