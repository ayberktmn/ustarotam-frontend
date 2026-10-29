import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Handshake, MapPin, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";

interface AboutPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const canonical = getPathname({ locale, href: "/hakkimizda" });

  return {
    title: t("aboutTitle"),
    description: t("aboutDescription"),
    alternates: {
      canonical,
      languages: {
        tr: getPathname({ locale: "tr", href: "/hakkimizda" }),
        en: getPathname({ locale: "en", href: "/hakkimizda" }),
      },
    },
    openGraph: {
      title: t("aboutTitle"),
      description: t("aboutDescription"),
      url: canonical,
    },
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.about");
  const common = await getTranslations("common");

  const values = [
    {
      icon: ShieldCheck,
      title: t("value1Title"),
      description: t("value1Description"),
    },
    {
      icon: Handshake,
      title: t("value2Title"),
      description: t("value2Description"),
    },
    {
      icon: MapPin,
      title: t("value3Title"),
      description: t("value3Description"),
    },
  ];

  return (
    <>
      <section className="border-b border-line bg-secondary/60">
        <div className="page-container py-12 lg:py-16">
          <p className="text-sm font-bold tracking-[0.16em] text-brand uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 max-w-3xl text-h1 text-ink">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-body-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </section>

      <section className="section-y bg-secondary">
        <div className="page-container grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <h2 className="text-h2 text-ink">{t("storyTitle")}</h2>
            <p className="mt-4 text-body text-muted-foreground">
              {t("paragraph1")}
            </p>
            <p className="mt-4 text-body text-muted-foreground">
              {t("paragraph2")}
            </p>

            <div className="mt-8">
              <Button asChild>
                <Link href="/usta-ara">
                  {common("search")}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-ink shadow-card">
            <Image
              src="/images/workshops/motor-rotasi-oto-servis.webp"
              alt="Usta Rotam"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
          </div>
        </div>

        <div className="page-container mt-12 grid gap-4 md:grid-cols-3">
          {values.map((value) => {
            const Icon = value.icon;

            return (
              <div
                key={value.title}
                className="rounded-2xl border border-line bg-card p-6 shadow-card"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-ink">
                  {value.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
