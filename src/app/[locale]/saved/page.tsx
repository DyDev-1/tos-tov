import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/shell/coming-soon";

export default async function SavedPage({ params }: PageProps<"/[locale]/saved">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Header");
  return <ComingSoon title={t("saved")} />;
}
