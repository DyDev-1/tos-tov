import { Bookmark } from "lucide-react";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceCard } from "@/components/places/place-card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { listPlaces } from "@/lib/services/places";
import { listPlacesQuerySchema } from "@/lib/validation/places";
import type { PlaceCard as PlaceCardData } from "@/lib/validation/places";

type SavedData = { state: "signed-out" } | { state: "ok"; items: PlaceCardData[]; total: number } | { state: "error" };

async function loadSaved(): Promise<SavedData> {
  try {
    const user = await getCurrentUser();
    if (!user) return { state: "signed-out" };
    const { items, total } = await listPlaces(listPlacesQuerySchema.parse({ limit: 100, sort: "recent" }), {
      savedByUserId: user.id,
    });
    return { state: "ok", items, total };
  } catch (error) {
    console.error("Saved page failed", error);
    return { state: "error" };
  }
}

// Saved: the places this person tapped Save on. Needs login. Reading the login makes the page dynamic.
export default async function SavedPage({ params }: PageProps<"/[locale]/saved">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  // The page depends on who is logged in, so it is built for each visit, not at build time.
  await connection();
  const t = await getTranslations({ locale, namespace: "Saved" });
  const th = await getTranslations({ locale, namespace: "Header" });
  const tc = await getTranslations({ locale, namespace: "Common" });
  const data = await loadSaved();

  const box = "w-full max-w-xl rounded-2xl bg-secondary p-6";
  const button =
    "mt-4 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">{th("saved")}</h1>

      {data.state === "signed-out" && (
        <div className={box}>
          <h2 className="font-heading text-xl font-bold">{t("signedOutTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("signedOutBody")}</p>
          <Link href={{ pathname: "/sign-in", query: { redirect_url: `/${locale}/saved` } }} className={button}>
            {th("logIn")}
          </Link>
        </div>
      )}

      {data.state === "error" && (
        <div role="alert" className={box}>
          <p>{tc("error")}</p>
          <Link href="/saved" className="mt-3 inline-flex min-h-11 items-center font-semibold text-laterite hover:underline">
            {tc("retry")}
          </Link>
        </div>
      )}

      {data.state === "ok" && data.items.length === 0 && (
        <div className={box}>
          <Bookmark aria-hidden className="size-8 text-primary/40" />
          <p className="mt-2 font-semibold">{t("empty")}</p>
          <p className="text-muted-foreground">{t("emptyHint")}</p>
          <Link href="/" className={button}>
            {t("explore")}
          </Link>
        </div>
      )}

      {data.state === "ok" && data.items.length > 0 && (
        <>
          <p role="status" className="text-muted-foreground">
            {t("count", { count: data.total })}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {data.items.map((place) => (
              <li key={place.id}>
                <PlaceCard place={place} locale={locale} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
