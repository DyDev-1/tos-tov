import { Mountain } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// Page layout for Sign up and Log in: text, tabs and the Clerk form on the left, a big photo on the right
// (desktop only). Clerk handles the form and the passwords; we never touch them.
export async function AuthPage({
  mode,
  locale,
  children,
}: {
  mode: "sign-up" | "sign-in";
  locale: Locale;
  children: ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "Auth" });
  const signUp = mode === "sign-up";
  const tab = "flex min-h-11 flex-1 items-center justify-center rounded-full px-4 font-semibold transition-colors";

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-6 lg:grid-cols-2 lg:py-10">
      <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none lg:pr-10">
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-5xl">
          {signUp ? t("title") : t("titleLogIn")}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{signUp ? t("body") : t("bodyLogIn")}</p>

        <nav aria-label={t("tabs")} className="mt-6 flex rounded-full bg-secondary p-1">
          <Link
            href="/sign-up"
            aria-current={signUp ? "page" : undefined}
            className={cn(tab, signUp ? "bg-background shadow-sm" : "text-secondary-foreground")}
          >
            {t("signUp")}
          </Link>
          <Link
            href="/sign-in"
            aria-current={!signUp ? "page" : undefined}
            className={cn(tab, !signUp ? "bg-background shadow-sm" : "text-secondary-foreground")}
          >
            {t("logIn")}
          </Link>
        </nav>

        <div className="mt-6 min-h-72">{children}</div>

        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center font-semibold text-laterite underline-offset-4 hover:underline"
        >
          {t("keepBrowsing")}
        </Link>
      </div>

      <div
        aria-hidden
        className="relative hidden min-h-[34rem] place-items-center overflow-hidden rounded-[2rem] bg-tint-moss lg:grid"
      >
        <Mountain className="size-40 text-primary/20" strokeWidth={1} />
      </div>
    </main>
  );
}
