import { getLocale, getTranslations } from "next-intl/server";

import { MapPin } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { CookiePreferencesLink } from "@/components/privacy/cookie-preferences-link";
import { Link } from "@/i18n/navigation";
import { getSpecialties } from "@/lib/workshops";
import type { Locale } from "@/types/locale";

async function SiteFooter() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const specialties = await getSpecialties().catch(() => []);
  const serviceLinks = specialties.slice(0, 6);

  return (
    <footer className="bg-ink text-white">
      <div className="h-1 w-full bg-brand" />
      <div className="page-container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo inverted subtitle={nav("brandSubtitle")} />
            <p className="mt-5 text-sm leading-relaxed text-white/65">
              {t("tagline")}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70">
              <MapPin aria-hidden="true" className="size-3.5 text-brand" />
              {t("location")}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">{t("explore")}</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/"
                  className="text-sm text-white/65 transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-brand/50 focus-visible:outline-none"
                >
                  {nav("home")}
                </Link>
              </li>
              <li><CookiePreferencesLink /></li>
              <li>
                <Link
                  href="/usta-ara"
                  className="text-sm text-white/65 transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-brand/50 focus-visible:outline-none"
                >
                  {nav("workshops")}
                </Link>
              </li>
              <li>
                <Link
                  href="/hizmetler"
                  className="text-sm text-white/65 transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-brand/50 focus-visible:outline-none"
                >
                  {nav("services")}
                </Link>
              </li>
              <li>
                <Link
                  href="/nasil-calisir"
                  className="text-sm text-white/65 transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-brand/50 focus-visible:outline-none"
                >
                  {nav("howItWorks")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">{t("services")}</h2>
            <ul className="mt-4 space-y-2.5">
              {serviceLinks.map((specialty) => (
                <li key={specialty.slug}>
                  <Link
                    href={{
                      pathname: "/usta-ara",
                      query: { uzmanlik: specialty.slug },
                    }}
                    className="text-sm text-white/65 transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-brand/50 focus-visible:outline-none"
                  >
                    {specialty.name[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">{t("company")}</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/hakkimizda"
                  className="text-sm text-white/65 transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-brand/50 focus-visible:outline-none"
                >
                  {t("about")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("rights")}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>{t("location")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { SiteFooter };
