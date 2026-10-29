import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ChevronRight, MapPin } from "lucide-react";

import { VerificationBadge } from "@/features/workshops/verification-badge";
import { WorkshopProfileRating } from "@/features/workshops/workshop-profile-rating";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Link as LocaleLink } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";
import type { Specialty, Workshop } from "@/types/workshop";

interface WorkshopProfileHeroProps {
  workshop: Workshop;
  specialtyDetails: readonly Specialty[];
  locale: Locale;
}

async function WorkshopProfileHero({
  workshop,
  specialtyDetails,
  locale,
}: WorkshopProfileHeroProps) {
  const t = await getTranslations("workshops");
  const profileT = await getTranslations("profile");

  return (
    <>
      <section className="relative h-56 overflow-hidden bg-ink sm:h-64 lg:h-72">
        <Image
          src={workshop.coverImage}
          alt={t("workshopAlt", { name: workshop.name })}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent"
        />
      </section>

      <div className="page-container relative z-10 -mt-20 pb-10">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-card sm:p-8">
          <nav aria-label={profileT("breadcrumb")}>
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <LocaleLink
                  href="/"
                  className="transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Usta Rotam
                </LocaleLink>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3" />
              </li>
              <li>
                <LocaleLink
                  href="/usta-ara"
                  className="transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {profileT("workshopProfile")}
                </LocaleLink>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3" />
              </li>
              <li className="min-w-0">
                <span
                  aria-current="page"
                  className="block max-w-60 truncate font-semibold text-ink sm:max-w-md"
                >
                  {workshop.name}
                </span>
              </li>
            </ol>
          </nav>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <VerificationBadge status={workshop.verificationStatus} />
                <Badge variant="secondary" className="font-semibold">
                  {profileT("workshopProfile")}
                </Badge>
              </div>

              <h1 className="mt-3 text-h1 text-ink">{workshop.name}</h1>

              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin aria-hidden="true" className="size-4 text-brand" />
                {workshop.district}, {workshop.city}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {specialtyDetails.map((specialty) => (
                  <Badge
                    key={specialty.slug}
                    variant="outline"
                    className="font-normal"
                  >
                    {specialty.shortName[locale]}
                  </Badge>
                ))}
              </div>

              <div className="mt-4">
                <FavoriteButton
                  workshopId={workshop.id}
                  workshopName={workshop.name}
                />
              </div>
            </div>

            <WorkshopProfileRating workshop={workshop} locale={locale} />
          </div>
        </div>
      </div>
    </>
  );
}

export { WorkshopProfileHero };
