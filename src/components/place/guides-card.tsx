import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pickText } from "@/lib/i18n-content";
import type { Guide } from "@/lib/validation/places";

// Local tours and guides: contact only. Booking and payment are out of scope.
export async function GuidesCard({ guides, locale }: { guides: Guide[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Place.tours" });
  const button =
    "inline-flex min-h-11 items-center rounded-full border-2 border-primary px-5 font-semibold text-primary transition-colors hover:bg-secondary";

  return (
    <section aria-labelledby="tours" className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/60">
      <h2 id="tours" className="font-heading text-xl font-bold">
        {t("title")}
      </h2>
      {guides.length === 0 ? (
        <p className="mt-3 text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {guides.map((guide) => (
            <li key={guide.id} className="flex items-center justify-between gap-3 py-4 first:pt-0">
              <div className="min-w-0">
                <p className="font-bold">{guide.name}</p>
                <p className="text-muted-foreground">
                  {[pickText(guide.tour, locale), guide.priceText].filter(Boolean).join(" · ")}
                </p>
              </div>
              {guide.contactType === "telegram" ? (
                <a
                  href={`https://t.me/${encodeURIComponent(guide.contactValue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("telegramFor", { name: guide.name })}
                  className={button}
                >
                  {t("telegram")}
                </a>
              ) : (
                <a
                  href={`tel:${guide.contactValue.replace(/[^+\d]/g, "")}`}
                  aria-label={t("callFor", { name: guide.name })}
                  className={button}
                >
                  {t("call")}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-sm text-muted-foreground">{t("note")}</p>
    </section>
  );
}
