"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/client-api";
import { monthName } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { DETAIL_KEYS, type DetailKey, type PlaceDetails } from "@/lib/validation/place-details";
import type { Category, Province } from "@/lib/validation/reference";
import type { getAdminPlace } from "@/lib/services/admin";
import { useAdminError } from "./admin-action";

export type AdminPlaceDetail = NonNullable<Awaited<ReturnType<typeof getAdminPlace>>>;

const input = "min-h-11 w-full rounded-xl border-2 border-border bg-background px-3 focus-visible:border-primary focus-visible:outline-none";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-1 block font-normal">{children}</span>
    </label>
  );
}

// The same labels the visitor sees on the place page, so the admin knows which fact is which.
const DETAIL_LABELS: Record<DetailKey, string> = {
  ticket: "Place.need.ticket",
  dressCode: "Place.need.dressCode",
  whatToBring: "Place.need.whatToBring",
  difficulty: "Place.need.difficulty",
  nearestTown: "Place.gettingThere.nearestTown",
  transport: "Place.gettingThere.transport",
  road: "Place.gettingThere.road",
  openingHours: "Place.practical.openingHours",
  timeNeeded: "Place.practical.timeNeeded",
  facilities: "Place.practical.facilities",
  avoidNote: "Admin.edit.avoidNote",
};

function MonthToggles({ value, onChange, legend }: { value: number[]; onChange: (months: number[]) => void; legend: string }) {
  const locale = useLocale() as Locale;
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const on = value.includes(month);
          return (
            <button
              key={month}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((m) => m !== month) : [...value, month].sort((a, b) => a - b))}
              className={cn(
                "min-h-11 min-w-14 rounded-full border-2 px-3 text-sm font-semibold",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
              )}
            >
              {monthName(month, locale, "short")}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Edit everything about a place. Saves with one PATCH to the admin API (which logs the change).
export function PlaceEditor({ place, provinces, categories }: { place: AdminPlaceDetail; provinces: Province[]; categories: Category[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const errorText = useAdminError();
  const router = useRouter();

  const [nameEn, setNameEn] = useState(place.name.en);
  const [nameKm, setNameKm] = useState(place.name.km);
  const [taglineEn, setTaglineEn] = useState(place.tagline.en ?? "");
  const [taglineKm, setTaglineKm] = useState(place.tagline.km ?? "");
  const [descriptionEn, setDescriptionEn] = useState(place.description.en ?? "");
  const [descriptionKm, setDescriptionKm] = useState(place.description.km ?? "");
  const [provinceSlug, setProvinceSlug] = useState(place.province.slug);
  const [categorySlug, setCategorySlug] = useState(place.category.slug);
  const [lat, setLat] = useState(String(place.location.lat));
  const [lng, setLng] = useState(String(place.location.lng));
  const [feeKhr, setFeeKhr] = useState(place.entryFee.khr === null ? "" : String(place.entryFee.khr));
  const [feeUsd, setFeeUsd] = useState(place.entryFee.usd === null ? "" : String(place.entryFee.usd));
  const [best, setBest] = useState<number[]>(place.bestMonths);
  const [avoid, setAvoid] = useState<number[]>(place.avoidMonths);
  const [details, setDetails] = useState<PlaceDetails>(place.details);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const setDetail = (key: DetailKey, lang: "en" | "km", value: string) =>
    setDetails((d) => ({ ...d, [key]: { ...d[key], [lang]: value } }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const empty = (value: string) => (value.trim() === "" ? null : value.trim());
    // Drop empty detail texts, so a cleared box really clears the fact.
    const cleanDetails: PlaceDetails = {};
    for (const key of DETAIL_KEYS) {
      const en = details[key]?.en?.trim();
      const km = details[key]?.km?.trim();
      if (en || km) cleanDetails[key] = { ...(en ? { en } : {}), ...(km ? { km } : {}) };
    }

    setBusy(true);
    setMessage(null);
    const result = await apiFetch(`/api/v1/admin/places/${place.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        nameEn: nameEn.trim(),
        nameKm: nameKm.trim(),
        taglineEn: empty(taglineEn),
        taglineKm: empty(taglineKm),
        descriptionEn: empty(descriptionEn),
        descriptionKm: empty(descriptionKm),
        provinceSlug,
        categorySlug,
        lat: Number(lat),
        lng: Number(lng),
        entryFeeKhr: empty(feeKhr) === null ? null : Number(feeKhr),
        entryFeeUsd: empty(feeUsd) === null ? null : Number(feeUsd),
        bestMonths: best,
        avoidMonths: avoid,
        details: cleanDetails,
      }),
    });
    setBusy(false);
    if (!result.ok) return setMessage({ ok: false, text: errorText(result.code) });
    setMessage({ ok: true, text: t("Admin.edit.savedAt") });
    router.refresh();
  }

  const section = "space-y-4 rounded-3xl border border-border bg-card p-5";

  return (
    <form onSubmit={save} className="space-y-6">
      <section aria-labelledby="ed-basics" className={section}>
        <h2 id="ed-basics" className="font-heading text-xl font-bold">{t("Admin.edit.basics")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Admin.edit.nameEn")}><input className={input} value={nameEn} onChange={(e) => setNameEn(e.target.value)} required maxLength={120} /></Field>
          <Field label={t("Admin.edit.nameKm")}><input className={input} value={nameKm} onChange={(e) => setNameKm(e.target.value)} required maxLength={120} /></Field>
          <Field label={t("Admin.edit.taglineEn")}><input className={input} value={taglineEn} onChange={(e) => setTaglineEn(e.target.value)} maxLength={160} /></Field>
          <Field label={t("Admin.edit.taglineKm")}><input className={input} value={taglineKm} onChange={(e) => setTaglineKm(e.target.value)} maxLength={160} /></Field>
          <Field label={t("Admin.edit.descriptionEn")}><textarea className={cn(input, "py-2")} rows={4} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} maxLength={2000} /></Field>
          <Field label={t("Admin.edit.descriptionKm")}><textarea className={cn(input, "py-2")} rows={4} value={descriptionKm} onChange={(e) => setDescriptionKm(e.target.value)} maxLength={2000} /></Field>
        </div>
      </section>

      <section aria-labelledby="ed-where" className={section}>
        <h2 id="ed-where" className="font-heading text-xl font-bold">{t("Admin.edit.where")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Admin.edit.province")}>
            <select className={input} value={provinceSlug} onChange={(e) => setProvinceSlug(e.target.value)}>
              {provinces.map((p) => <option key={p.id} value={p.slug}>{p.name[locale]}</option>)}
            </select>
          </Field>
          <Field label={t("Admin.edit.category")}>
            <select className={input} value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name[locale]}</option>)}
            </select>
          </Field>
          <Field label={t("Admin.edit.lat")}><input className={input} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} required /></Field>
          <Field label={t("Admin.edit.lng")}><input className={input} inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} required /></Field>
        </div>
      </section>

      <section aria-labelledby="ed-fees" className={section}>
        <h2 id="ed-fees" className="font-heading text-xl font-bold">{t("Admin.edit.fees")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Admin.edit.feeKhr")}><input className={input} inputMode="numeric" value={feeKhr} onChange={(e) => setFeeKhr(e.target.value)} /></Field>
          <Field label={t("Admin.edit.feeUsd")}><input className={input} inputMode="decimal" value={feeUsd} onChange={(e) => setFeeUsd(e.target.value)} /></Field>
        </div>
      </section>

      <section aria-labelledby="ed-months" className={section}>
        <h2 id="ed-months" className="font-heading text-xl font-bold">{t("Admin.edit.months")}</h2>
        <MonthToggles legend={t("Admin.edit.bestMonths")} value={best} onChange={setBest} />
        <MonthToggles legend={t("Admin.edit.avoidMonths")} value={avoid} onChange={setAvoid} />
      </section>

      <section aria-labelledby="ed-details" className={section}>
        <h2 id="ed-details" className="font-heading text-xl font-bold">{t("Admin.edit.details")}</h2>
        <div className="space-y-4">
          {DETAIL_KEYS.map((key) => (
            <fieldset key={key} className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-semibold sm:col-span-2">{t(DETAIL_LABELS[key])}</legend>
              <label className="block">
                <span className="sr-only">{t(DETAIL_LABELS[key])} ({t("Admin.edit.en")})</span>
                <input className={input} placeholder={t("Admin.edit.en")} value={details[key]?.en ?? ""} onChange={(e) => setDetail(key, "en", e.target.value)} maxLength={500} />
              </label>
              <label className="block">
                <span className="sr-only">{t(DETAIL_LABELS[key])} ({t("Admin.edit.km")})</span>
                <input className={input} placeholder={t("Admin.edit.km")} value={details[key]?.km ?? ""} onChange={(e) => setDetail(key, "km", e.target.value)} maxLength={500} />
              </label>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background py-3">
        <button type="submit" disabled={busy} className="min-h-12 rounded-full bg-primary px-8 text-lg font-bold text-primary-foreground disabled:opacity-60">
          {busy ? t("Admin.common.saving") : t("Admin.actions.save")}
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "font-semibold text-primary" : "font-semibold text-destructive"}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
