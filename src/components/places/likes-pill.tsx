import { Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

// White pill with a laterite heart and the number of likes, shown on photo cards.
export function LikesPill({ count }: { count: number }) {
  const locale = useLocale();
  const t = useTranslations("Common");
  return (
    <span
      aria-label={t("likes", { count })}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-background px-3 text-sm font-semibold shadow-sm"
    >
      <Heart aria-hidden className="size-4 fill-laterite text-laterite" />
      {new Intl.NumberFormat(locale).format(count)}
    </span>
  );
}
