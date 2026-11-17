import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/shell/coming-soon";

export default async function MapPage({ params }: PageProps<"/[locale]/map">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Header");
  return <ComingSoon title={t("map")} />;
}
