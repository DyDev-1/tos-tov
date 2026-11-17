"use client";

import { useAuth } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { PhotoPicker } from "@/components/add-place/photo-picker";
import { usePhotoUploads } from "@/components/photos/use-photo-uploads";
import { StarInput } from "@/components/posts/star-input";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { PlacePicker, type PickedPlace } from "./place-picker";
import { ShareMenu } from "./share-menu";

type Errors = Partial<Record<"place" | "rating" | "date" | "story", string>>;
type Done = { status: "pending" | "published"; place: PickedPlace };

const inputClass =
  "min-h-12 w-full rounded-2xl border-2 border-border bg-card px-4 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none aria-[invalid=true]:border-destructive";

// Share a post: choose the place, rate it, say when you visited, tell the story, add photos.
// `today` comes from the server (Cambodia's date), so the date box starts on today without a mismatch.
export function SharePostForm({ preselected, today }: { preselected: PickedPlace | null; today: string }) {
  const t = useTranslations("Share");
  const locale = useLocale() as Locale;
  const { isLoaded, isSignedIn } = useAuth();
  const uploads = usePhotoUploads();

  const [place, setPlace] = useState<PickedPlace | null>(preselected);
  const [rating, setRating] = useState(0);
  const [visitedAt, setVisitedAt] = useState(today);
  const [story, setStory] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState<null | { current: number; total: number }>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  function validate(): Errors {
    const found: Errors = {};
    if (!place) found.place = t("errors.place");
    if (rating < 1) found.rating = t("errors.rating");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitedAt) || visitedAt > today) found.date = t("errors.date");
    if (story.trim().length < 10) found.story = t("errors.story");
    return found;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setSubmitting({ current: 0, total: uploads.photos.length });
    const urls = await uploads.upload((current, total) => setSubmitting({ current, total }));
    if (typeof urls === "string") {
      setSubmitting(null);
      setServerError(urls === "uploads_off" ? t("errors.uploadsOff") : urls === "login" ? t("errors.loginExpired") : t("errors.uploadFailed"));
      return;
    }

    const result = await apiFetch<{ id: number; status: "pending" | "published" }>(`/api/v1/places/${place!.slug}/posts`, {
      method: "POST",
      body: JSON.stringify({ story: story.trim(), rating, visitedAt, photos: urls }),
    });
    setSubmitting(null);

    if (result.ok) {
      uploads.reset();
      setDone({ status: result.data.status, place: place! });
      return;
    }
    if (result.status === 404) {
      setServerError(t("errors.placeGone"));
      setPlace(null);
    } else if (result.status === 429) setServerError(t("errors.rateLimited"));
    else if (result.status === 401) setServerError(t("errors.loginExpired"));
    else setServerError(t("errors.failed"));
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  function another() {
    setPlace(null);
    setRating(0);
    setVisitedAt(today);
    setStory("");
    setErrors({});
    setServerError(null);
    uploads.reset();
    setDone(null);
  }

  if (!isLoaded) {
    return (
      <div role="status" aria-busy="true" className="space-y-4">
        <span className="sr-only">{t("loginGate.loading")}</span>
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-12 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!isSignedIn) {
    const next = `/${locale}/share${preselected ? `?place=${preselected.slug}` : ""}`;
    return (
      <div className="rounded-3xl bg-secondary p-6">
        <h2 className="font-heading text-xl font-bold">{t("loginGate.title")}</h2>
        <p className="mt-1 text-muted-foreground">{t("loginGate.body")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={{ pathname: "/sign-in", query: { redirect_url: next } }}
            className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
          >
            {t("loginGate.logIn")}
          </Link>
          <Link
            href={{ pathname: "/sign-up", query: { redirect_url: next } }}
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
      <div role="status" className="space-y-4 rounded-3xl bg-secondary p-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-primary">{t("success.title")}</h2>
          <p className="mt-1">{done.status === "published" ? t("success.live") : t("success.body")}</p>
        </div>
        <div>
          <p className="mb-2 font-semibold">{t("success.shareTitle")}</p>
          <ShareMenu path={`/${locale}/places/${done.place.slug}`} text={done.place.name} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/places/${done.place.slug}`} className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">
            {t("success.viewPlace")}
          </Link>
          <Link href="/" className="inline-flex min-h-12 items-center rounded-full border-2 border-primary px-6 font-semibold text-primary">
            {t("success.home")}
          </Link>
          <button type="button" onClick={another} className="inline-flex min-h-12 items-center px-4 font-semibold text-laterite hover:underline">
            {t("success.another")}
          </button>
        </div>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form noValidate onSubmit={submit} className="space-y-8 pb-24 md:pb-0" aria-busy={!!submitting}>
      {(errorCount > 0 || serverError) && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="space-y-1 rounded-2xl bg-destructive/10 p-4 outline-none">
          {errorCount > 0 && <p className="font-semibold text-destructive">{t("errors.summary")}</p>}
          {serverError && <p className="font-semibold text-destructive">{serverError}</p>}
        </div>
      )}

      <PlacePicker
        selected={place}
        error={errors.place}
        onSelect={(picked) => {
          setPlace(picked);
          setErrors((e) => ({ ...e, place: undefined }));
        }}
      />

      <StarInput
        label={t("rating.label")}
        value={rating}
        error={errors.rating}
        onChange={(value) => {
          setRating(value);
          setErrors((e) => ({ ...e, rating: undefined }));
        }}
      />

      <div>
        <label htmlFor="visited-at" className="mb-2 block font-bold">
          {t("visited.label")}
        </label>
        <input
          id="visited-at"
          type="date"
          value={visitedAt}
          max={today}
          onChange={(event) => setVisitedAt(event.target.value)}
          aria-invalid={!!errors.date}
          aria-describedby={errors.date ? "visited-at-error" : undefined}
          className={cn(inputClass, "sm:max-w-xs")}
        />
        {errors.date && (
          <p id="visited-at-error" role="alert" className="mt-1 text-sm font-semibold text-destructive">
            {errors.date}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="story" className="mb-2 block font-bold">
          {t("story.label")}
        </label>
        <textarea
          id="story"
          value={story}
          onChange={(event) => setStory(event.target.value)}
          placeholder={t("story.placeholder")}
          maxLength={3000}
          rows={6}
          aria-invalid={!!errors.story}
          aria-describedby={errors.story ? "story-error" : undefined}
          className={cn(inputClass, "py-3")}
        />
        {errors.story && (
          <p id="story-error" role="alert" className="mt-1 text-sm font-semibold text-destructive">
            {errors.story}
          </p>
        )}
      </div>

      <PhotoPicker
        label={t("photos.label")}
        items={uploads.photos}
        processing={uploads.processing}
        messages={uploads.messages}
        onAdd={async (files) => void (await uploads.addPhotos(files))}
        onRemove={uploads.removePhoto}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 md:static md:z-auto md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-[45rem] flex-col gap-2 md:flex-row md:items-center md:gap-5">
          <button
            type="submit"
            disabled={!!submitting || uploads.processing}
            className="min-h-14 shrink-0 rounded-full bg-laterite px-10 text-lg font-bold text-laterite-foreground transition-colors hover:bg-laterite/90 disabled:opacity-60 md:min-w-72"
          >
            {submitting
              ? submitting.current > 0
                ? t("submit.uploading", { current: submitting.current, total: submitting.total })
                : t("submit.sending")
              : t("submit.send")}
          </button>
          <p className="text-sm text-muted-foreground">{t("submit.note")}</p>
        </div>
      </div>
    </form>
  );
}
