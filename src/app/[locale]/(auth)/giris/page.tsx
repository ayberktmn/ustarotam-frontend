import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/features/auth/login-form";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";

interface LoginPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const canonical = getPathname({ locale, href: "/giris" });

  return {
    title: t("loginTitle"),
    description: t("loginDescription"),
    alternates: {
      canonical,
      languages: {
        tr: getPathname({ locale: "tr", href: "/giris" }),
        en: getPathname({ locale: "en", href: "/giris" }),
      },
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.login");

  return (
    <div className="page-container pb-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-card shadow-card lg:grid-cols-2">
        <div className="p-6 sm:p-10">
          <h1 className="text-h1 text-ink">{t("title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>

          <LoginForm />
        </div>

        <div className="relative hidden min-h-[640px] overflow-hidden bg-ink lg:block">
          <Image
            src="/images/workshops/motor-rotasi-oto-servis.webp"
            alt=""
            fill
            sizes="50vw"
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/10" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
              Usta Rotam
            </p>
            <h2 className="mt-3 text-h2 text-white">{t("sideTitle")}</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              {t("sideDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
