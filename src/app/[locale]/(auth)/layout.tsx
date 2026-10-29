import { getTranslations, setRequestLocale } from "next-intl/server";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { GuestOnly } from "@/features/auth/guest-only";
import type { Locale } from "@/types/locale";

interface AuthLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AuthLayout({
  children,
  params,
}: AuthLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("nav");

  return (
    <div className="min-h-screen bg-cream">
      <header className="page-container flex h-20 items-center justify-between">
        <Logo subtitle={t("brandSubtitle")} />
        <LanguageSwitcher />
      </header>
      <main id="main-content">
        <GuestOnly>{children}</GuestOnly>
      </main>
    </div>
  );
}
