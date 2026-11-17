import { SignIn } from "@clerk/nextjs";
import { setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import type { Locale } from "@/i18n/routing";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default async function SignInPage({ params }: PageProps<"/[locale]/sign-in/[[...sign-in]]">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);

  return (
    <AuthPage mode="sign-in" locale={locale}>
      <SignIn
        routing="path"
        path={`/${locale}/sign-in`}
        signUpUrl={`/${locale}/sign-up`}
        fallbackRedirectUrl={`/${locale}`}
        appearance={clerkAppearance}
      />
    </AuthPage>
  );
}
