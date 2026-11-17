import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { monthName } from "@/lib/dates";
import { cn } from "@/lib/utils";

// 12 months in a row. Best months are filled green, months to avoid have a dashed laterite
// outline, and the current month has a laterite ring. Colour is never the only signal:
// each month also has a text label for screen readers.
export async function MonthStrip({
  bestMonths,
  avoidMonths,
  currentMonth,
  locale,
}: {
  bestMonths: number[];
  avoidMonths: number[];
  currentMonth: number;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "Place.season" });
  // Khmer one-letter month names repeat (ម appears 4 times), so Khmer uses the short names on 2 rows.
  const khmer = locale === "km";

  return (
    <div>
      <ol className={cn("grid gap-1.5", khmer ? "grid-cols-6 md:grid-cols-12" : "grid-cols-12")}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const best = bestMonths.includes(month);
          const avoid = avoidMonths.includes(month);
          const now = month === currentMonth;
          const status = [best && t("bestMonth"), avoid && t("avoidMonth"), now && t("currentMonth")].filter(Boolean);
          return (
            <li
              key={month}
              data-month={month}
              data-status={[best && "best", avoid && "avoid", now && "now"].filter(Boolean).join(" ")}
              className={cn(
                "grid min-h-11 place-items-center rounded-lg text-sm font-semibold",
                best && "bg-primary text-primary-foreground",
                avoid && "border-2 border-dashed border-laterite bg-background text-laterite",
                !best && !avoid && "bg-secondary text-muted-foreground",
                now && "ring-2 ring-laterite ring-offset-2 ring-offset-background",
              )}
            >
              <span aria-hidden>{monthName(month, locale, khmer ? "short" : "narrow")}</span>
              <span className="sr-only">
                {monthName(month, locale)}
                {status.length > 0 && `: ${status.join(", ")}`}
              </span>
            </li>
          );
        })}
      </ol>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded bg-primary" />
          {t("best")}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded border-2 border-dashed border-laterite" />
          {t("avoid")}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 rounded ring-2 ring-laterite" />
          {t("now")}
        </li>
      </ul>
    </div>
  );
}
