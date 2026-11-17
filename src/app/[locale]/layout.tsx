import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bricolage_Grotesque, Noto_Sans, Noto_Sans_Khmer } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <ClerkProvider>
      <html
        lang={locale}
        className={`${heading.variable} ${body.variable} ${khmer.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
