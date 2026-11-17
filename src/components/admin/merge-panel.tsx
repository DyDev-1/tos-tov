"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/client-api";
import { pickText } from "@/lib/i18n-content";
import type { AdminPlaceRow } from "@/lib/services/admin";
import { AdminAction } from "./admin-action";

// Merge THIS place (the duplicate) into another one: search for the place to keep, then confirm.
export function MergePanel({ placeId }: { placeId: number }) {
  const t = useTranslations("Admin");
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminPlaceRow[]>([]);
  const [chosen, setChosen] = useState<AdminPlaceRow | null>(null);

  const text = query.trim();
  useEffect(() => {
    if (text.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await apiFetch<AdminPlaceRow[]>(`/api/v1/admin/places?q=${encodeURIComponent(text)}&limit=6`);
      if (cancelled || !result.ok) return;
      // Only places that can receive a merge: not this one, not hidden, not already merged.
      setResults(result.data.filter((p) => p.id !== placeId && p.status !== "hidden" && !p.mergedInto));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, placeId]);

  const shown = text.length >= 2 ? results : [];
  const nameOf = (place: AdminPlaceRow) => pickText(place.name, locale) ?? place.slug;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">{t("edit.mergeHelp")}</p>
      {chosen ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-secondary p-4">
          <AdminAction
            label={t("edit.mergeInto", { name: nameOf(chosen) })}
            endpoint={`/api/v1/admin/places/${placeId}/merge`}
            body={{ targetId: chosen.id }}
            confirm={t("edit.mergeConfirm", { name: nameOf(chosen) })}
            variant="danger"
          />
          <button type="button" onClick={() => setChosen(null)} className="min-h-11 rounded-full px-4 font-semibold hover:bg-background">
            {t("actions.cancel")}
          </button>
        </div>
      ) : (
        <>
          <label className="block text-sm font-semibold">
            {t("edit.mergeSearch")}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={100}
              className="mt-1 min-h-11 w-full rounded-xl border-2 border-border bg-background px-3 font-normal focus-visible:border-primary focus-visible:outline-none"
            />
          </label>
          <ul className="space-y-1">
            {shown.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  data-testid="merge-result"
                  onClick={() => setChosen(place)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl p-3 text-left hover:bg-secondary"
                >
                  <span className="font-semibold">{nameOf(place)}</span>
                  <span className="text-sm text-muted-foreground">{pickText(place.province.name, locale)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
