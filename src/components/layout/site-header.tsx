import { getLocale, getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";

import { AuthActions } from "@/components/layout/auth-actions";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Link } from "@/i18n/navigation";
import { getSpecialties } from "@/lib/workshops";
import type { Locale } from "@/types/locale";

async function SiteHeader() {
  const [t, locale, specialties] = await Promise.all([
    getTranslations("nav"),
    getLocale(),
    getSpecialties().catch(() => []),
  ]);
  const services = specialties.map((specialty) => ({
    slug: specialty.slug,
    name: specialty.name[locale as Locale],
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-card/95 backdrop-blur-md">
      <div className="page-container flex h-18 items-center justify-between gap-4">
        <Logo subtitle={t("brandSubtitle")} />

        <MainNav services={services} />

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <Link
            href="/hesabim/favoriler"
            aria-label={t("favorites")}
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink/75 transition-colors hover:bg-brand-soft hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:inline-flex"
          >
            <Heart aria-hidden="true" className="size-4" />
            <span className="hidden xl:inline">{t("favorites")}</span>
          </Link>

          <AuthActions />

          <MobileNav />
        </div>
      </div>
    </header>
  );
}

export { SiteHeader };
