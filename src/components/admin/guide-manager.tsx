"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/client-api";
import { pickText } from "@/lib/i18n-content";
import { AdminAction, useAdminError } from "./admin-action";
import type { AdminPlaceDetail } from "./place-editor";

type Guide = AdminPlaceDetail["guides"][number];
const input = "min-h-11 w-full rounded-xl border-2 border-border bg-background px-3 focus-visible:border-primary focus-visible:outline-none";

// Add or edit a local tour or guide. Contact only: visitors call or message the guide themselves.
function GuideForm({ placeId, guide, onDone }: { placeId: number; guide?: Guide; onDone?: () => void }) {
  const t = useTranslations("Admin");
  const errorText = useAdminError();
  const router = useRouter();
  const [type, setType] = useState<"telegram" | "phone">(guide?.contactType ?? "telegram");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const price = String(data.get("priceText") ?? "").trim();
    setBusy(true);
    setMessage(null);
    const result = await apiFetch(guide ? `/api/v1/admin/guides/${guide.id}` : `/api/v1/admin/places/${placeId}/guides`, {
      method: guide ? "PUT" : "POST",
      body: JSON.stringify({
        name: String(data.get("name")).trim(),
        tourEn: String(data.get("tourEn")).trim(),
        tourKm: String(data.get("tourKm")).trim(),
        priceText: price === "" ? null : price,
        contactType: type,
        contactValue: String(data.get("contactValue")).trim(),
      }),
    });
    setBusy(false);
    if (!result.ok) return setMessage(errorText(result.code));
    if (!guide) form.reset();
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" aria-label={guide ? guide.name : t("edit.addGuide")}>
      <label className="block text-sm font-semibold">{t("edit.guideName")}<input name="name" required maxLength={80} defaultValue={guide?.name} className={input} /></label>
      <label className="block text-sm font-semibold">{t("edit.guidePrice")}<input name="priceText" maxLength={60} defaultValue={guide?.priceText ?? ""} className={input} /></label>
      <label className="block text-sm font-semibold">{t("edit.guideTourEn")}<input name="tourEn" required maxLength={160} defaultValue={guide?.tour.en} className={input} /></label>
      <label className="block text-sm font-semibold">{t("edit.guideTourKm")}<input name="tourKm" required maxLength={160} defaultValue={guide?.tour.km} className={input} /></label>
      <label className="block text-sm font-semibold">
        {t("edit.guideContactType")}
        <select value={type} onChange={(e) => setType(e.target.value as "telegram" | "phone")} className={input}>
          <option value="telegram">{t("edit.guideTelegram")}</option>
          <option value="phone">{t("edit.guidePhone")}</option>
        </select>
      </label>
      <div className="text-sm font-semibold">
        <label htmlFor={`contact-${guide?.id ?? "new"}`}>{type === "telegram" ? t("edit.guideTelegram") : t("edit.guidePhone")}</label>
        <input
          id={`contact-${guide?.id ?? "new"}`}
          name="contactValue"
          required
          maxLength={40}
          defaultValue={guide?.contactValue}
          aria-describedby={`contact-help-${guide?.id ?? "new"}`}
          className={`${input} mt-1`}
        />
        <span id={`contact-help-${guide?.id ?? "new"}`} className="font-normal text-muted-foreground">
          {type === "telegram" ? t("edit.guideTelegramHelp") : t("edit.guidePhoneHelp")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? t("common.saving") : guide ? t("actions.save") : t("actions.add")}
        </button>
        {message && <p role="alert" className="font-semibold text-destructive">{message}</p>}
      </div>
    </form>
  );
}

export function GuideManager({ placeId, guides }: { placeId: number; guides: Guide[] }) {
  const t = useTranslations("Admin");
  const locale = useLocale() as Locale;
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {guides.length === 0 && <p className="text-muted-foreground">{t("edit.noGuides")}</p>}
      <ul className="space-y-3">
        {guides.map((guide) => (
          <li key={guide.id} data-testid="admin-guide" className="rounded-2xl bg-secondary p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{guide.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[pickText(guide.tour, locale), guide.priceText, `${guide.contactType === "telegram" ? "Telegram" : "☎"} ${guide.contactValue}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" aria-expanded={editing === guide.id} onClick={() => setEditing(editing === guide.id ? null : guide.id)} className="min-h-11 rounded-full px-4 font-semibold text-primary hover:bg-background">
                  {t("common.edit")}
                </button>
                <AdminAction label={t("actions.delete")} endpoint={`/api/v1/admin/guides/${guide.id}`} method="DELETE" confirm={t("common.confirm")} variant="danger" />
              </div>
            </div>
            {editing === guide.id && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <GuideForm placeId={placeId} guide={guide} onDone={() => setEditing(null)} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-dashed border-border p-4">
        <h3 className="mb-3 font-heading font-bold">{t("edit.addGuide")}</h3>
        <GuideForm placeId={placeId} />
      </div>
    </div>
  );
}
