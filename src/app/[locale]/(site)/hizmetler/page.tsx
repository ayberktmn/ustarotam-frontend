import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Wrench } from "lucide-react";

import { SpecialtyIcon } from "@/features/workshops/specialty-icon";
import { Button } from "@/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import { getSpecialtyCards } from "@/lib/workshops";
import type { Locale } from "@/types/locale";

interface ServicesPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: ServicesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const canonical = getPathname({ locale, href: "/hizmetler" });

  return {
    title: t("servicesTitle"),
    description: t("servicesDescription"),
    alternates: {
      canonical,
      languages: {
        tr: getPathname({ locale: "tr", href: "/hizmetler" }),
        en: getPathname({ locale: "en", href: "/hizmetler" }),
      },
    },
    openGraph: {
      title: t("servicesTitle"),
      description: t("servicesDescription"),
      url: canonical,
    },
  };
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [specialtyCards, t, common] = await Promise.all([
    getSpecialtyCards(),
    getTranslations("pages.services"),
    getTranslations("common"),
  ]);

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
        <div className="page-container">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {specialtyCards.map((specialty) => (
              <Link
                key={specialty.slug}
                href={{
                  pathname: "/usta-ara",
                  query: { uzmanlik: specialty.slug },
                }}
                className="group flex flex-col rounded-2xl border border-line bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                    <SpecialtyIcon slug={specialty.slug} className="size-5" />
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {t("workshopCount", { count: specialty.workshopCount })}
                  </span>
                </div>
                <h2 className="mt-5 text-h3 text-ink">
                  {specialty.name[locale]}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {specialty.description[locale]}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                  {common("viewAll")}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-3xl bg-ink px-6 py-10 text-center text-white sm:px-10">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand text-white">
              <Wrench aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 text-h2 text-white">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">
              {t("ctaDescription")}
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/usta-ara">
                {t("ctaButton")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
