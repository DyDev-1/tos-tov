"use client";

import { useTranslations } from "next-intl";

// Shown when a page crashes, for example when the database is down. "Try again" reloads that page.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("Common");
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-4 px-4 py-10">
      <div role="alert" className="w-full max-w-xl rounded-2xl bg-secondary p-6">
        <p>{t("error")}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground"
        >
          {t("retry")}
        </button>
      </div>
    </main>
  );
}
