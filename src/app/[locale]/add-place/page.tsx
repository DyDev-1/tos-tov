import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/shell/coming-soon";

export default async function AddPlacePage({ params }: PageProps<"/[locale]/add-place">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Shell");
  return <ComingSoon title={t("addPlace")} />;
}
