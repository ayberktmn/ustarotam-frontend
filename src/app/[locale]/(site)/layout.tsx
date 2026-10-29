import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { Locale } from "@/types/locale";

interface SiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function SiteLayout({
  children,
  params,
}: SiteLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:ring-3 focus:ring-brand/50 focus:outline-none"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
