"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Shown instead of a form that is not open yet at the current release stage.
// `loginHref` adds a quiet "Team member? Log in" link, so an admin can still get in.
export function FeatureClosed({
  namespace,
  loginHref,
}: {
  namespace: "AddPlace" | "Share";
  loginHref?: { pathname: string; query: Record<string, string> };
}) {
  const t = useTranslations(`${namespace}.closed`);
  return (
    <div role="status" className="rounded-3xl bg-secondary p-6">
      <h2 className="font-heading text-xl font-bold">{t("title")}</h2>
      <p className="mt-1 text-muted-foreground">{t("body")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">
          {t("back")}
        </Link>
        {loginHref && (
          <Link href={loginHref} className="inline-flex min-h-11 items-center font-semibold text-laterite underline-offset-4 hover:underline">
            {t("team")}
          </Link>
        )}
      </div>
    </div>
  );
}
