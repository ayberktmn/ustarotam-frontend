import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FeaturedWorkshopsSection } from "@/features/home/featured-workshops-section";
import { HomeCategoriesSection } from "@/features/home/home-categories-section";
import { HomeHero } from "@/features/home/home-hero";
import { HomeProcessSection } from "@/features/home/home-process-section";
import { HomeTestimonialsSection } from "@/features/home/home-testimonials-section";
import { HomeTrustStrip } from "@/features/home/home-trust-strip";
import { getPathname } from "@/i18n/navigation";
import { defaultOpenGraphImage } from "@/lib/site";
import {
  getFeaturedWorkshops,
  getSpecialties,
  getSpecialtyCards,
} from "@/lib/workshops";
import type { Locale } from "@/types/locale";

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const canonical = getPathname({ locale, href: "/" });

  return {
    title: { absolute: t("homeTitle") },
    description: t("homeDescription"),
    alternates: {
      canonical,
      languages: {
        tr: getPathname({ locale: "tr", href: "/" }),
        en: getPathname({ locale: "en", href: "/" }),
      },
    },
    openGraph: {
      title: t("homeTitle"),
      description: t("homeDescription"),
      url: canonical,
      images: [defaultOpenGraphImage],
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [
    specialtyCards,
    featuredWorkshops,
    specialties,
  ] = await Promise.all([
    getSpecialtyCards().catch(() => []),
    getFeaturedWorkshops(4).catch(() => []),
    getSpecialties().catch(() => []),
  ]);

  return (
    <>
      <HomeHero />
      <HomeTrustStrip />
      <FeaturedWorkshopsSection
        featuredWorkshops={featuredWorkshops}
        specialties={specialties}
      />
      <HomeCategoriesSection
        specialtyCards={specialtyCards}
        locale={locale}
      />
      <HomeTestimonialsSection locale={locale} />
      <HomeProcessSection />
    </>
  );
}
