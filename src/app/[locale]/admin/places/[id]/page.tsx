import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminAction } from "@/components/admin/admin-action";
import { GuideManager } from "@/components/admin/guide-manager";
import { StatusBadge } from "@/components/admin/list-controls";
import { LogList } from "@/components/admin/lists";
import { MergePanel } from "@/components/admin/merge-panel";
import { PlaceEditor } from "@/components/admin/place-editor";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/admin-page";
import { pickText } from "@/lib/i18n-content";
import { getAdminPlace, listAuditLog } from "@/lib/services/admin";
import { listCategories, listProvinces } from "@/lib/services/reference";

export default async function AdminPlacePage({ params }: PageProps<"/[locale]/admin/places/[id]">) {
  const { locale: rawLocale, id: rawId } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  await connection();
  await requireAdminPage(locale, `/admin/places/${rawId}`);

  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const place = await getAdminPlace(id);
  if (!place) notFound();

  const t = await getTranslations({ locale, namespace: "Admin" });
  const [provinces, categories, history] = await Promise.all([
    listProvinces(),
    listCategories(),
    listAuditLog({ limit: 10, offset: 0, targetType: "place", targetId: id }),
  ]);
  const section = "space-y-4 rounded-3xl border border-border bg-card p-5";
  const api = (path: string) => `/api/v1/admin/${path}`;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/places" className="font-semibold text-laterite hover:underline">
            ← {t("places.title")}
          </Link>
          <h1 className="mt-1 font-heading text-3xl font-bold text-primary">{pickText(place.name, locale)}</h1>
          <p className="text-muted-foreground">
            {t("edit.title")} · {place.slug}
          </p>
        </div>
        <StatusBadge status={place.status} />
      </div>

      <section aria-labelledby="visibility" className={section}>
        <h2 id="visibility" className="font-heading text-xl font-bold">{t("edit.statusSection")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {place.status === "pending" && <AdminAction label={t("actions.approve")} endpoint={api(`places/${id}/status`)} body={{ status: "published" }} variant="primary" />}
          {place.status === "hidden" && !place.mergedInto && <AdminAction label={t("actions.unhide")} endpoint={api(`places/${id}/status`)} body={{ status: "published" }} />}
          {place.status !== "hidden" && <AdminAction label={t("actions.hide")} endpoint={api(`places/${id}/status`)} body={{ status: "hidden" }} confirm={t("common.confirm")} variant="danger" />}
          {place.status === "published" && (
            <Link href={`/places/${place.slug}`} className="inline-flex min-h-11 items-center px-3 font-semibold text-primary hover:underline">
              {t("common.viewOnSite")}
            </Link>
          )}
          {place.mergedInto && <span className="text-muted-foreground">{t("places.mergedInto")}</span>}
        </div>
      </section>

      <PlaceEditor place={place} provinces={provinces} categories={categories} />

      <section aria-labelledby="guides" className={section}>
        <h2 id="guides" className="font-heading text-xl font-bold">{t("edit.guides")}</h2>
        <GuideManager placeId={id} guides={place.guides} />
      </section>

      <section aria-labelledby="photos" className={section}>
        <h2 id="photos" className="font-heading text-xl font-bold">{t("edit.photos")}</h2>
        {place.photos.length === 0 ? (
          <p className="text-muted-foreground">{t("edit.noPhotos")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {place.photos.map((photo) => (
              <li key={photo.id} className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- small WebP files from our own storage */}
                <img src={photo.url} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
                {photo.fromPost && <p className="text-sm text-muted-foreground">{t("edit.fromPost")}</p>}
                <AdminAction label={t("edit.deletePhoto")} endpoint={api(`photos/${photo.id}`)} method="DELETE" confirm={t("common.confirm")} variant="danger" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {!place.mergedInto && (
        <section aria-labelledby="merge" className={section}>
          <h2 id="merge" className="font-heading text-xl font-bold">{t("edit.merge")}</h2>
          <MergePanel placeId={id} />
        </section>
      )}

      <section aria-labelledby="history" className="space-y-3">
        <h2 id="history" className="font-heading text-xl font-bold">{t("edit.history")}</h2>
        {history.items.length === 0 ? <p className="text-muted-foreground">{t("edit.noHistory")}</p> : <LogList items={history.items} />}
        {history.total > 0 && (
          <Link href={{ pathname: "/admin/log", query: { type: "place", id: String(id) } }} className="font-semibold text-laterite hover:underline">
            {t("log.title")} →
          </Link>
        )}
      </section>
    </main>
  );
}
