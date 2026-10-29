import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Car, MapPin, Star } from "lucide-react";

import { FavoriteButton } from "@/features/favorites/favorite-button";
import { VerificationBadge } from "@/features/workshops/verification-badge";
import { Button } from "@/components/ui/button";
import { WorkshopIdentity } from "@/components/workshops/workshop-identity";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatCount, formatRating } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type { Specialty, Workshop } from "@/types/workshop";

interface WorkshopCardProps {
  workshop: Workshop;
  specialties: readonly Specialty[];
  compact?: boolean;
}

async function WorkshopCard({
  workshop,
  specialties,
  compact = false,
}: WorkshopCardProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("workshops");
  const common = await getTranslations("common");

  const specialtyDetails = workshop.specialties
    .map((slug) => specialties.find((specialty) => specialty.slug === slug))
    .filter((specialty): specialty is Specialty => specialty !== undefined);
  const profileHref = {
    pathname: "/usta/[slug]" as const,
    params: { slug: workshop.slug },
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-card transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-xl">
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          compact ? "aspect-[16/9]" : "aspect-[16/10]",
        )}
      >
        <Image
          src={workshop.coverImage}
          alt={t("workshopAlt", { name: workshop.name })}
          fill
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/10" />

        <div className={compact ? "absolute top-2 left-2" : "absolute top-3 left-3"}>
          <VerificationBadge status={workshop.verificationStatus} />
        </div>
        <WorkshopIdentity name={workshop.name} logoUrl={workshop.logoUrl} className="absolute right-3 bottom-3 size-11 border-2 border-card shadow-card" />

        <FavoriteButton
          workshopId={workshop.id}
          workshopName={workshop.name}
          variant="overlay"
          className={cn(
            "absolute",
            compact ? "top-2 right-2 size-8" : "top-3 right-3 size-9",
          )}
        />

        {workshop.rating !== null ? (
          <div
            className={cn(
              "absolute inline-flex items-center gap-1.5 rounded-lg bg-ink/75 text-white backdrop-blur-sm",
              compact
                ? "bottom-2 left-2 px-2 py-1"
                : "bottom-3 left-3 px-2.5 py-1.5",
            )}
          >
            <Star aria-hidden="true" className="size-3.5 fill-star text-star" />
            <span className="text-sm font-bold">
              {formatRating(workshop.rating, locale)}
            </span>
            <span className="text-xs text-white/75">
              ({formatCount(workshop.reviewCount, locale)})
            </span>
          </div>
        ) : (
          <span
            className={cn(
              "absolute rounded-lg bg-card/90 text-xs font-semibold text-ink",
              compact
                ? "bottom-2 left-2 px-2 py-1"
                : "bottom-3 left-3 px-2.5 py-1.5",
            )}
          >
            {t("noRatingShort")}
          </span>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "p-4" : "p-5")}>
        {workshop.verificationStatus === "verified" ? (
          <Link
            href={profileHref}
            className={cn(
              "font-bold tracking-tight text-ink transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              compact ? "text-base" : "text-lg",
            )}
          >
            {workshop.name}
          </Link>
        ) : (
          <p
            className={cn(
              "font-bold tracking-tight text-ink",
              compact ? "text-base" : "text-lg",
            )}
          >
            {workshop.name}
          </p>
        )}

        <div
          className={cn(
            "mt-2 flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {specialtyDetails.slice(0, 3).map((specialty, index) => (
            <span key={specialty.slug} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-line">
                  ·
                </span>
              ) : null}
              {specialty.shortName[locale]}
            </span>
          ))}
        </div>

        <div
          className={cn(
            "space-y-2 text-muted-foreground",
            compact ? "mt-3 text-xs" : "mt-4 text-sm",
          )}
        >
          <p className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="size-4 text-brand" />
            {workshop.district}, {workshop.city}
          </p>
          <p className="flex items-center gap-2">
            <Car aria-hidden="true" className="size-4 text-brand" />
            {t("allBrands")}
          </p>
        </div>

        <div className={compact ? "mt-auto pt-3" : "mt-auto pt-5"}>
          {workshop.verificationStatus === "verified" ? (
            <Button
              asChild
              variant="outline"
              size={compact ? "sm" : "default"}
              className="w-full"
            >
              <Link href={profileHref}>{common("viewDetails")}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export { WorkshopCard };
