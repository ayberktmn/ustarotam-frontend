import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Manrope } from "next/font/google";
import { notFound } from "next/navigation";

import { AppProviders } from "@/components/providers/app-providers";
import { routing } from "@/i18n/routing";
import { defaultOpenGraphImage, getSiteUrl, siteConfig } from "@/lib/site";
import { locales } from "@/types/locale";

import "../globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Omit<LocaleLayoutProps, "children">): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: t("siteTitle"),
      template: "%s | Usta Rotam",
    },
    description: t("siteDescription"),
    applicationName: siteConfig.name,
    keywords: t("keywords").split(", "),
    authors: [{ name: "Usta Rotam" }],
    creator: "Usta Rotam",
    publisher: "Usta Rotam",
    category: "automotive",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    appleWebApp: {
      capable: true,
      title: "Usta Rotam",
      statusBarStyle: "default",
    },
    openGraph: {
      type: "website",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      siteName: siteConfig.name,
      title: t("siteTitle"),
      description: t("siteDescription"),
      images: [defaultOpenGraphImage],
    },
    twitter: {
      card: "summary_large_image",
      title: t("siteTitle"),
      description: t("siteDescription"),
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#ff6b36",
  colorScheme: "light",
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${manrope.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
