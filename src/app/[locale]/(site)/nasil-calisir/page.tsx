import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, MapPin, MessageCircle, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";

interface HowItWorksPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: HowItWorksPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const canonical = getPathname({ locale, href: "/nasil-calisir" });

  return {
    title: t("howItWorksTitle"),
    description: t("howItWorksDescription"),
    alternates: {
      canonical,
      languages: {
        tr: getPathname({ locale: "tr", href: "/nasil-calisir" }),
        en: getPathname({ locale: "en", href: "/nasil-calisir" }),
      },
    },
    openGraph: {
      title: t("howItWorksTitle"),
      description: t("howItWorksDescription"),
      url: canonical,
    },
  };
}

export default async function HowItWorksPage({
  params,
}: HowItWorksPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.howItWorks");

  const steps = [
    {
      icon: MapPin,
      title: t("step1Title"),
      description: t("step1Description"),
    },
    {
      icon: Star,
      title: t("step2Title"),
      description: t("step2Description"),
    },
    {
      icon: MessageCircle,
      title: t("step3Title"),
      description: t("step3Description"),
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
        <div className="page-container">
          <ol className="grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <li
                  key={step.title}
                  className="relative overflow-hidden rounded-2xl border border-line bg-card p-6 shadow-card"
                >
                  <span className="absolute top-5 right-5 text-5xl font-extrabold text-brand/10">
                    0{index + 1}
                  </span>
                  <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h2 className="mt-5 text-h3 text-ink">{step.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="mt-12 rounded-3xl bg-ink px-6 py-12 text-center text-white sm:px-10">
            <h2 className="text-h2 text-white">{t("ctaTitle")}</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-white/60">
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
