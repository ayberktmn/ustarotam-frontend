import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { WorkshopAboutSection } from "@/features/workshops/workshop-about-section";
import { WorkshopContactAside } from "@/features/workshops/workshop-contact-aside";
import { WorkshopProfileHero } from "@/features/workshops/workshop-profile-hero";
import { WorkshopRatingSection } from "@/features/workshops/workshop-rating-section";
import { WorkshopReviewsSection } from "@/features/workshops/workshop-reviews-section";
import { WorkshopSpecialtiesSection } from "@/features/workshops/workshop-specialties-section";
import { getPathname } from "@/i18n/navigation";
import { defaultOpenGraphImage } from "@/lib/site";
import {
  getSpecialties,
  getWorkshopBySlug,
  getWorkshopSlugs,
} from "@/lib/workshops";
import type { Locale } from "@/types/locale";

interface WorkshopPageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function generateStaticParams() {
  const slugs = await getWorkshopSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: WorkshopPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const workshop = await getWorkshopBySlug(slug);

  if (!workshop) {
    return {
      title: "404",
      robots: { index: false, follow: false },
    };
  }

  const description = `${workshop.name}, ${workshop.district} / ${workshop.city}. ${truncate(
    workshop.description[locale],
    130,
  )}`;
  const href = {
    pathname: "/usta/[slug]" as const,
    params: { slug: workshop.slug },
  };

  return {
    title: `${workshop.name} — ${workshop.district}`,
    description,
    alternates: {
      canonical: getPathname({ locale, href }),
      languages: {
        tr: getPathname({ locale: "tr", href }),
        en: getPathname({ locale: "en", href }),
      },
    },
    openGraph: {
      type: "profile",
      title: `${workshop.name} — ${workshop.district}, ${workshop.city}`,
      description,
      url: getPathname({ locale, href }),
      images: [defaultOpenGraphImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function WorkshopPage({ params }: WorkshopPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [workshop, specialties] = await Promise.all([
    getWorkshopBySlug(slug),
    getSpecialties(),
  ]);

  if (!workshop) {
    notFound();
  }

  if (slug !== workshop.slug) {
    redirect(
      getPathname({
        locale,
        href: {
          pathname: "/usta/[slug]",
          params: { slug: workshop.slug },
        },
      }),
    );
  }

  const specialtyDetails = workshop.specialties.flatMap((specialtySlug) => {
    const specialty = specialties.find((item) => item.slug === specialtySlug);

    return specialty ? [specialty] : [];
  });

  return (
    <>
      <WorkshopProfileHero
        workshop={workshop}
        specialtyDetails={specialtyDetails}
        locale={locale}
      />

      <div className="page-container grid gap-8 pb-14 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <WorkshopAboutSection workshop={workshop} locale={locale} />
          <WorkshopSpecialtiesSection
            specialties={specialtyDetails}
            locale={locale}
          />
          <WorkshopRatingSection workshop={workshop} locale={locale} />
          <WorkshopReviewsSection workshop={workshop} />
        </div>

        <WorkshopContactAside workshop={workshop} locale={locale} />
      </div>
    </>
  );
}
