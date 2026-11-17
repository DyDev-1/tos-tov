"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";

// Translate an error code from the admin API ("slug_taken") into the admin's language.
export function useAdminError() {
  const t = useTranslations("Admin");
  return (code?: string) => (code && t.has(`errors.${code}`) ? t(`errors.${code}`) : t("common.errorGeneric"));
}

const VARIANTS = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border-2 border-primary text-primary hover:bg-secondary",
  danger: "border-2 border-destructive text-destructive hover:bg-destructive/10",
} as const;

// One button that calls an admin API route, then refreshes the page's data.
// With `confirm`, the first click asks "Are you sure?" with Yes / No (for hiding, banning, deleting).
export function AdminAction({
  label,
  endpoint,
  method = "POST",
  body,
  confirm,
  variant = "outline",
  onDone,
  className,
}: {
  label: string;
  endpoint: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  confirm?: string;
  variant?: keyof typeof VARIANTS;
  onDone?: () => void;
  className?: string;
}) {
  const t = useTranslations("Admin.common");
  const errorText = useAdminError();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setAsking(false);
    setBusy(true);
    setError(null);
    const result = await apiFetch(endpoint, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    setBusy(false);
    if (result.ok) {
      onDone?.();
      router.refresh();
    } else {
      setError(errorText(result.code));
    }
  }

  const button = "inline-flex min-h-11 items-center justify-center rounded-full px-4 font-semibold transition-colors disabled:opacity-60";

  if (asking) {
    return (
      <span role="group" aria-label={confirm} className="inline-flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{confirm}</span>
        <button type="button" onClick={run} className={cn(button, VARIANTS.danger)}>
          {t("yes")}
        </button>
        <button type="button" onClick={() => setAsking(false)} className={cn(button, "hover:bg-secondary")}>
          {t("no")}
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => (confirm ? setAsking(true) : run())}
        className={cn(button, VARIANTS[variant], className)}
      >
        {busy ? t("saving") : label}
      </button>
      {error && (
        <span role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
