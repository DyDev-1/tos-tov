import { SignUp } from "@clerk/nextjs";
import { setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import type { Locale } from "@/i18n/routing";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default async function SignUpPage({ params }: PageProps<"/[locale]/sign-up/[[...sign-up]]">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);

  return (
    <AuthPage mode="sign-up" locale={locale}>
      <SignUp
        routing="path"
        path={`/${locale}/sign-up`}
        signInUrl={`/${locale}/sign-in`}
        fallbackRedirectUrl={`/${locale}`}
        appearance={clerkAppearance}
      />
    </AuthPage>
  );
}
