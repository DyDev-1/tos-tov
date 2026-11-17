"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/client-api";
import { AdminAction, useAdminError } from "./admin-action";

type Row = { id: number; slug: string; name: { en: string; km: string }; sortOrder: number; placeCount: number };

const input = "min-h-11 w-full rounded-xl border-2 border-border bg-background px-3 focus-visible:border-primary focus-visible:outline-none";

// One form for adding and editing: names in both languages, the web name, and the order.
function CategoryForm({ category, onDone }: { category?: Row; onDone?: () => void }) {
  const t = useTranslations("Admin");
  const errorText = useAdminError();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const sortOrder = String(data.get("sortOrder") ?? "").trim();
    const body = {
      slug: String(data.get("slug")).trim(),
      nameEn: String(data.get("nameEn")).trim(),
      nameKm: String(data.get("nameKm")).trim(),
      ...(sortOrder !== "" ? { sortOrder: Number(sortOrder) } : {}),
    };
    setBusy(true);
    setMessage(null);
    const result = await apiFetch(category ? `/api/v1/admin/categories/${category.id}` : "/api/v1/admin/categories", {
      method: category ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!result.ok) return setMessage({ ok: false, text: errorText(result.code) });
    setMessage({ ok: true, text: t("common.saved") });
    if (!category) form.reset();
    router.refresh();
    onDone?.();
  }

  const id = category ? `cat-${category.id}` : "cat-new";
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" aria-label={category ? undefined : t("categories.add")}>
      <label className="block text-sm font-semibold">
        {t("categories.nameEn")}
        <input name="nameEn" required maxLength={60} defaultValue={category?.name.en} className={input} id={`${id}-en`} />
      </label>
      <label className="block text-sm font-semibold">
        {t("categories.nameKm")}
        <input name="nameKm" required maxLength={60} defaultValue={category?.name.km} className={input} id={`${id}-km`} />
      </label>
      <div className="text-sm font-semibold">
        <label htmlFor={`${id}-slug`}>{t("categories.slug")}</label>
        <input
          id={`${id}-slug`}
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxLength={80}
          defaultValue={category?.slug}
          aria-describedby={`${id}-slug-help`}
          className={`${input} mt-1`}
        />
        <span id={`${id}-slug-help`} className="font-normal text-muted-foreground">
          {t("categories.slugHelp")}
        </span>
      </div>
      <label className="block text-sm font-semibold">
        {t("categories.order")}
        <input name="sortOrder" inputMode="numeric" pattern="[0-9]*" defaultValue={category?.sortOrder} className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? t("common.saving") : category ? t("actions.save") : t("actions.add")}
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

export function CategoryManager({ categories }: { categories: Row[] }) {
  const t = useTranslations("Admin");
  const locale = useLocale() as Locale;
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {categories.length === 0 && <p className="rounded-2xl bg-secondary p-6 text-muted-foreground">{t("categories.empty")}</p>}
      <ul className="space-y-3">
        {categories.map((category) => (
          <li key={category.id} data-testid="admin-category" className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-heading text-lg font-bold">{category.name[locale]}</p>
                <p className="text-sm text-muted-foreground">
                  {category.name[locale === "km" ? "en" : "km"]} · {category.slug} · #{category.sortOrder} · {t("categories.places", { count: category.placeCount })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-expanded={editing === category.id}
                  onClick={() => setEditing(editing === category.id ? null : category.id)}
                  className="min-h-11 rounded-full px-4 font-semibold text-primary hover:bg-secondary"
                >
                  {t("common.edit")}
                </button>
                {category.placeCount === 0 && (
                  <AdminAction
                    label={t("actions.delete")}
                    endpoint={`/api/v1/admin/categories/${category.id}`}
                    method="DELETE"
                    confirm={t("categories.deleteConfirm", { name: category.name[locale] })}
                    variant="danger"
                  />
                )}
              </div>
            </div>
            {editing === category.id && (
              <div className="mt-4 border-t border-border pt-4">
                <CategoryForm category={category} onDone={() => setEditing(null)} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <section aria-labelledby="add-category" className="rounded-3xl bg-secondary p-5">
        <h2 id="add-category" className="mb-3 font-heading text-xl font-bold">
          {t("categories.add")}
        </h2>
        <CategoryForm />
      </section>
    </div>
  );
}
