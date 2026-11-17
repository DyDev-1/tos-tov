"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { REPORT_REASONS } from "@/lib/validation/engagement";

// "Report a problem with this place": opens a small form. Needs login, so reports can be followed up.
export function ReportProblem({ slug }: { slug: string }) {
  const t = useTranslations("Place");
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    const result = await apiFetch(`/api/v1/places/${slug}/reports`, {
      method: "POST",
      body: JSON.stringify({ reason: form.get("reason"), message: form.get("message") || undefined }),
    });
    setState(result.ok ? "sent" : "error");
  }

  if (state === "sent") {
    return (
      <p role="status" className="rounded-2xl bg-secondary p-4">
        {t("report.thanks")}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => (isSignedIn ? setOpen(true) : clerk.openSignIn())}
        className="inline-flex min-h-11 items-center font-semibold text-laterite underline-offset-4 hover:underline"
      >
        {t("trust.report")}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h3 className="font-heading font-bold">{t("report.title")}</h3>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t("report.reason")}</span>
        <select
          name="reason"
          required
          defaultValue=""
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3"
        >
          <option value="" disabled />
          {REPORT_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {t(`report.reasons.${reason}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t("report.message")}</span>
        <textarea
          name="message"
          maxLength={1000}
          rows={3}
          className="w-full rounded-xl border border-border bg-background p-3"
        />
      </label>
      {state === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t("report.error")}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={state === "sending"}
          className="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {state === "sending" ? t("report.sending") : t("report.send")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-full px-4 font-semibold">
          {t("report.cancel")}
        </button>
      </div>
    </form>
  );
}
