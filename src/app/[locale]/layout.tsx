import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bricolage_Grotesque, Noto_Sans, Noto_Sans_Khmer } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddPlaceFab } from "@/components/shell/add-place-fab";
import { BottomTabBar } from "@/components/shell/bottom-tab-bar";
import { SiteHeader } from "@/components/shell/site-header";
import { clerkProviderAppearance } from "@/lib/clerk-appearance";
import { clerkKhmer } from "@/lib/clerk-km";
import { routing } from "@/i18n/routing";
import "../globals.css";

// Fonts from uxui.md: Bricolage Grotesque (headings), Noto Sans (body), Noto Sans Khmer (Khmer script).
const heading = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const body = Noto_Sans({ variable: "--font-noto", subsets: ["latin"] });
const khmer = Noto_Sans_Khmer({ variable: "--font-noto-khmer", subsets: ["khmer"] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    // Full addresses in share previews need the site's own address.
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Shell" });

  return (
    <ClerkProvider
      // Sign-in pages live under the language prefix (/en/sign-in, /km/sign-in).
      signInUrl={`/${locale}/sign-in`}
      signUpUrl={`/${locale}/sign-up`}
      signInFallbackRedirectUrl={`/${locale}`}
      signUpFallbackRedirectUrl={`/${locale}`}
      appearance={clerkProviderAppearance}
      localization={locale === "km" ? clerkKhmer : undefined}
    >
      <html
        lang={locale}
        className={`${heading.variable} ${body.variable} ${khmer.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">
          <NextIntlClientProvider>
            <a
              href="#content"
              className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
            >
              {t("skipToContent")}
            </a>
            <SiteHeader />
            {/* Extra bottom space on phone so the tab bar and "Add a place" button never cover content. */}
            <div id="content" className="flex flex-1 flex-col pb-44 md:pb-24">
              {children}
            </div>
            <BottomTabBar />
            <AddPlaceFab />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
