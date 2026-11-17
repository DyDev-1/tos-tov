"use client";

import { useAuth } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/client-api";
import { prepareImage } from "@/lib/images";
import { checkImageFile, MAX_PHOTOS_PER_PLACE } from "@/lib/uploads-shared";
import { cn } from "@/lib/utils";
import type { Category, Province } from "@/lib/validation/reference";
import { MonthPicker } from "./month-picker";
import { PhotoPicker, type PhotoItem } from "./photo-picker";
import { DEFAULT_PIN, isInsideCambodia, PinPicker, type Pin } from "./pin-picker";
import { SimilarPlaces } from "./similar-places";

const DRAFT_KEY = "tostov:add-place-draft:v1";

type Fields = {
  name: string;
  provinceSlug: string;
  categorySlug: string;
  description: string;
  months: number[];
  feeKhr: string;
  feeUsd: string;
  bring: string;
  pin: Pin | null; // null until the person moves the pin
};
const EMPTY: Fields = {
  name: "",
  provinceSlug: "",
  categorySlug: "",
  description: "",
  months: [],
  feeKhr: "",
  feeUsd: "",
  bring: "",
  pin: null,
};

type Errors = Partial<Record<"name" | "province" | "category" | "photos" | "pin" | "feeKhr" | "feeUsd", string>>;
type Done = { slug: string; status: "pending" | "published" };
type Duplicate = { slug: string; name: { en: string; km: string } };

function readDraft(): Fields | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : null;
  } catch {
    return null; // private window, blocked storage, or damaged data: just start empty
  }
}
function writeDraft(fields: Fields | null) {
  try {
    if (fields) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(fields));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage is optional */
  }
}
const hasContent = (f: Fields) =>
  !!(f.name || f.provinceSlug || f.categorySlug || f.description || f.months.length || f.feeKhr || f.feeUsd || f.bring || f.pin);

const inputClass =
  "min-h-12 w-full rounded-2xl border-2 border-border bg-card px-4 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none aria-[invalid=true]:border-destructive";

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-bold">
        {label} {optional && <span className="font-normal text-muted-foreground">{optional}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function AddPlaceForm({ provinces, categories }: { provinces: Province[]; categories: Category[] }) {
  const t = useTranslations("AddPlace");
  const locale = useLocale() as Locale;
  const { isLoaded, isSignedIn } = useAuth();

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoMessages, setPhotoMessages] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState<null | { current: number; total: number }>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const uploaded = useRef(new Map<string, string>()); // photo id -> public URL, so a retry never uploads twice
  const summaryRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  // Bring back a draft saved earlier on this phone (text only; photos are not kept).
  useEffect(() => {
    const draft = readDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the browser's storage can only happen after the page loads
    if (draft) setFields(draft);
    restored.current = true;
  }, []);

  // Save the draft a moment after the person stops typing.
  useEffect(() => {
    if (!restored.current || done) return;
    const timer = setTimeout(() => {
      if (hasContent(fields)) {
        writeDraft(fields);
        setDraftSaved(true);
      } else {
        writeDraft(null);
        setDraftSaved(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [fields, done]);

  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  // Free the preview images from memory when leaving the page.
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const set = useCallback(<K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    setDuplicate(null);
  }, []);

  async function addPhotos(files: File[]) {
    const messages: string[] = [];
    const room = MAX_PHOTOS_PER_PLACE - photos.length;
    const chosen = files.slice(0, Math.max(room, 0));
    if (files.length > chosen.length) messages.push(t("photos.tooMany", { max: MAX_PHOTOS_PER_PLACE }));

    setProcessing(true);
    const added: PhotoItem[] = [];
    for (const file of chosen) {
      const check = checkImageFile(file);
      if (check === "not_image") messages.push(t("photos.notImage", { name: file.name }));
      else if (check === "too_big") messages.push(t("photos.tooBig", { name: file.name }));
      else {
        try {
          const prepared = await prepareImage(file);
          added.push({
            id: crypto.randomUUID(),
            name: file.name,
            previewUrl: URL.createObjectURL(prepared.blob),
            blob: prepared.blob,
            contentType: prepared.contentType,
          });
        } catch {
          messages.push(t("photos.cannotRead", { name: file.name }));
        }
      }
    }
    setProcessing(false);
    setPhotoMessages(messages);
    if (added.length > 0) {
      setPhotos((list) => [...list, ...added]);
      setErrors((e) => ({ ...e, photos: undefined }));
    }
  }

  function removePhoto(id: string) {
    setPhotos((list) => {
      const gone = list.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return list.filter((p) => p.id !== id);
    });
    uploaded.current.delete(id);
    setPhotoMessages([]);
  }

  function validate(): Errors {
    const found: Errors = {};
    if (fields.name.trim().length < 2) found.name = t("errors.name");
    if (!fields.provinceSlug) found.province = t("errors.province");
    if (!fields.categorySlug) found.category = t("errors.category");
    if (photos.length === 0) found.photos = t("errors.photos");
    if (!fields.pin) found.pin = t("errors.pin");
    else if (!isInsideCambodia(fields.pin)) found.pin = t("pin.outside");
    if (fields.feeKhr.trim() !== "" && !/^\d{1,8}$/.test(fields.feeKhr.trim())) found.feeKhr = t("errors.fee");
    if (fields.feeUsd.trim() !== "" && !/^\d{1,5}(\.\d{1,2})?$/.test(fields.feeUsd.trim())) found.feeUsd = t("errors.feeUsd");
    return found;
  }

  // Upload each photo straight to Cloudflare R2, using a link our server signs. Returns the public URLs.
  async function uploadPhotos(): Promise<string[] | "uploads_off" | "login" | "failed"> {
    const urls: string[] = [];
    for (const [index, photo] of photos.entries()) {
      const known = uploaded.current.get(photo.id);
      if (known) {
        urls.push(known);
        continue;
      }
      setSubmitting({ current: index + 1, total: photos.length });
      const link = await apiFetch<{ uploadUrl: string; publicUrl: string; headers: Record<string, string> }>(
        "/api/v1/uploads/image",
        { method: "POST", body: JSON.stringify({ contentType: photo.contentType, size: photo.blob.size }) },
      );
      if (!link.ok) return link.status === 503 ? "uploads_off" : link.status === 401 ? "login" : "failed";
      try {
        const put = await fetch(link.data.uploadUrl, { method: "PUT", headers: link.data.headers, body: photo.blob });
        if (!put.ok) return "failed";
      } catch {
        return "failed";
      }
      uploaded.current.set(photo.id, link.data.publicUrl);
      urls.push(link.data.publicUrl);
    }
    return urls;
  }

  async function submit(event: React.FormEvent, allowDuplicate = false) {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setSubmitting({ current: 0, total: photos.length });
    const urls = await uploadPhotos();
    if (typeof urls === "string") {
      setSubmitting(null);
      setServerError(urls === "uploads_off" ? t("errors.uploadsOff") : urls === "login" ? t("errors.loginExpired") : t("errors.uploadFailed"));
      return;
    }

    const pin = fields.pin!;
    const result = await apiFetch<Done>("/api/v1/places", {
      method: "POST",
      body: JSON.stringify({
        name: fields.name.trim(),
        provinceSlug: fields.provinceSlug,
        categorySlug: fields.categorySlug,
        lat: pin.lat,
        lng: pin.lng,
        photos: urls,
        description: fields.description.trim() || undefined,
        bestMonths: fields.months,
        entryFeeKhr: fields.feeKhr.trim() === "" ? undefined : Number(fields.feeKhr),
        entryFeeUsd: fields.feeUsd.trim() === "" ? undefined : Number(fields.feeUsd),
        whatToBring: fields.bring.trim() || undefined,
        allowDuplicate,
      }),
    });
    setSubmitting(null);

    if (result.ok) {
      writeDraft(null);
      setDraftSaved(false);
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setDone(result.data);
      return;
    }
    if (result.status === 409 && result.code === "possible_duplicate") {
      setDuplicate(result.details as Duplicate);
      requestAnimationFrame(() => summaryRef.current?.focus());
    } else if (result.status === 429) setServerError(t("errors.rateLimited"));
    else if (result.status === 401) setServerError(t("errors.loginExpired"));
    else setServerError(t("errors.failed"));
  }

  function reset() {
    setFields(EMPTY);
    setPhotos([]);
    setErrors({});
    setDuplicate(null);
    setServerError(null);
    uploaded.current.clear();
    setDone(null);
  }

  // ---- Screens ----

  if (!isLoaded) {
    return (
      <div role="status" aria-busy="true" className="space-y-4">
        <span className="sr-only">{t("loginGate.loading")}</span>
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-12 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-3xl bg-secondary p-6">
        <h2 className="font-heading text-xl font-bold">{t("loginGate.title")}</h2>
        <p className="mt-1 text-muted-foreground">{t("loginGate.body")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={{ pathname: "/sign-in", query: { redirect_url: `/${locale}/add-place` } }}
            className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
          >
            {t("loginGate.logIn")}
          </Link>
          <Link
            href={{ pathname: "/sign-up", query: { redirect_url: `/${locale}/add-place` } }}
            className="inline-flex min-h-12 items-center rounded-full border-2 border-primary px-6 font-semibold text-primary"
          >
            {t("loginGate.signUp")}
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div role="status" className="rounded-3xl bg-secondary p-6">
        <h2 className="font-heading text-2xl font-bold text-primary">{t("success.title")}</h2>
        <p className="mt-1">{done.status === "published" ? t("success.live") : t("success.body")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {done.status === "published" && (
            <Link href={`/places/${done.slug}`} className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">
              {t("success.view")}
            </Link>
          )}
          <Link href="/" className="inline-flex min-h-12 items-center rounded-full border-2 border-primary px-6 font-semibold text-primary">
            {t("success.home")}
          </Link>
          <button type="button" onClick={reset} className="inline-flex min-h-12 items-center px-4 font-semibold text-laterite hover:underline">
            {t("success.another")}
          </button>
        </div>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;
  const opt = t("optional");

  return (
    <form noValidate onSubmit={(event) => submit(event)} className="space-y-8 pb-24 md:pb-0" aria-busy={!!submitting}>
      {(errorCount > 0 || serverError || duplicate) && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="space-y-2 rounded-2xl bg-destructive/10 p-4 outline-none">
          {errorCount > 0 && <p className="font-semibold text-destructive">{t("errors.summary")}</p>}
          {serverError && <p className="font-semibold text-destructive">{serverError}</p>}
          {duplicate && (
            <div>
              <p className="font-semibold">{t("duplicate.title")}</p>
              <p className="text-sm">{t("duplicate.body", { name: duplicate.name[locale] || duplicate.name.en })}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/places/${duplicate.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground"
                >
                  {t("duplicate.view", { name: duplicate.name[locale] || duplicate.name.en })}
                </Link>
                <button
                  type="button"
                  onClick={(event) => submit(event, true)}
                  className="inline-flex min-h-11 items-center rounded-full border-2 border-primary px-5 font-semibold text-primary"
                >
                  {t("duplicate.anyway")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <PhotoPicker items={photos} processing={processing} messages={photoMessages} error={errors.photos} onAdd={addPhotos} onRemove={removePhoto} />

      <Field id="place-name" label={t("name.label")} error={errors.name}>
        <input
          id="place-name"
          value={fields.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("name.placeholder")}
          maxLength={120}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "place-name-error" : undefined}
          className={inputClass}
          autoComplete="off"
        />
      </Field>

      <SimilarPlaces name={fields.name} pin={fields.pin} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="place-province" label={t("province.label")} error={errors.province}>
          <select
            id="place-province"
            value={fields.provinceSlug}
            onChange={(e) => set("provinceSlug", e.target.value)}
            aria-invalid={!!errors.province}
            aria-describedby={errors.province ? "place-province-error" : undefined}
            className={inputClass}
          >
            <option value="">{t("province.placeholder")}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name[locale]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="place-category" label={t("category.label")} error={errors.category}>
          <select
            id="place-category"
            value={fields.categorySlug}
            onChange={(e) => set("categorySlug", e.target.value)}
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? "place-category-error" : undefined}
            className={inputClass}
          >
            <option value="">{t("category.placeholder")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name[locale]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <PinPicker
        pin={fields.pin ?? DEFAULT_PIN}
        touched={!!fields.pin}
        error={errors.pin}
        onChange={(pin) => {
          set("pin", pin);
          setErrors((e) => ({ ...e, pin: undefined }));
        }}
      />

      <Field id="place-description" label={t("description.label")} optional={opt}>
        <textarea
          id="place-description"
          value={fields.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder={t("description.placeholder")}
          maxLength={2000}
          rows={4}
          className={cn(inputClass, "py-3")}
        />
      </Field>

      <MonthPicker value={fields.months} onChange={(months) => set("months", months)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="place-fee-khr" label={t("feeKhr.label")} optional={opt} error={errors.feeKhr}>
          <input
            id="place-fee-khr"
            inputMode="numeric"
            value={fields.feeKhr}
            onChange={(e) => set("feeKhr", e.target.value)}
            placeholder={t("feeKhr.placeholder")}
            aria-invalid={!!errors.feeKhr}
            aria-describedby={errors.feeKhr ? "place-fee-khr-error" : undefined}
            className={inputClass}
          />
        </Field>
        <Field id="place-fee-usd" label={t("feeUsd.label")} optional={opt} error={errors.feeUsd}>
          <input
            id="place-fee-usd"
            inputMode="decimal"
            value={fields.feeUsd}
            onChange={(e) => set("feeUsd", e.target.value)}
            placeholder={t("feeUsd.placeholder")}
            aria-invalid={!!errors.feeUsd}
            aria-describedby={errors.feeUsd ? "place-fee-usd-error" : undefined}
            className={inputClass}
          />
        </Field>
      </div>

      <Field id="place-bring" label={t("bring.label")} optional={opt}>
        <textarea
          id="place-bring"
          value={fields.bring}
          onChange={(e) => set("bring", e.target.value)}
          placeholder={t("bring.placeholder")}
          maxLength={500}
          rows={3}
          className={cn(inputClass, "py-3")}
        />
      </Field>

      {/* On phone this bar is pinned to the bottom of the screen, as in the design. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 md:static md:z-auto md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-[45rem] flex-col gap-2 md:flex-row md:items-center md:gap-5">
          <button
            type="submit"
            disabled={!!submitting || processing}
            className="min-h-14 shrink-0 rounded-full bg-laterite px-10 text-lg font-bold text-laterite-foreground transition-colors hover:bg-laterite/90 disabled:opacity-60 md:min-w-72"
          >
            {submitting
              ? submitting.current > 0
                ? t("submit.uploading", { current: submitting.current, total: submitting.total })
                : t("submit.sending")
              : t("submit.send")}
          </button>
          <p className="text-sm text-muted-foreground">
            {t("submit.note")}
            {draftSaved && <span className="block font-semibold text-primary">{t("submit.draftSaved")}</span>}
          </p>
        </div>
      </div>
    </form>
  );
}
