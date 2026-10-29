"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Heart, MapPin, Star } from "lucide-react";
import { toast } from "sonner";

import { useFavorites } from "@/features/favorites/favorites-provider";
import { Link } from "@/i18n/navigation";
import { formatRating } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type { Workshop } from "@/types/workshop";

interface FavoriteCardProps {
  workshop: Workshop;
}

function FavoriteCard({ workshop }: FavoriteCardProps) {
  const t = useTranslations("account.favorites");
  const workshopsT = useTranslations("workshops");
  const locale = useLocale() as Locale;
  const { removeFavorite } = useFavorites();

  const href = {
    pathname: "/usta/[slug]" as const,
    params: { slug: workshop.slug },
  };

  function handleRemove() {
    if (removeFavorite(workshop.id)) {
      toast.success(t("removedToast"));
    }
  }

  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        <Image
          src={workshop.coverImage}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {workshop.verificationStatus === "verified" ? (
              <Link
                href={href}
                className="block truncate font-bold text-ink transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {workshop.name}
              </Link>
            ) : (
              <span className="block truncate font-bold text-ink">
                {workshop.name}
              </span>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5 text-brand" />
              {workshop.district}, {workshop.city}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            aria-label={t("removeFor", { name: workshop.name })}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-card text-brand transition-colors hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Heart aria-hidden="true" className="size-4 fill-brand" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Star aria-hidden="true" className="size-3.5 fill-star text-star" />
            {workshop.rating !== null
              ? formatRating(workshop.rating, locale)
              : workshopsT("noRatingShort")}
          </span>
          {workshop.verificationStatus === "verified" ? (
            <Link
              href={href}
              className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {t("viewProfile")}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export { FavoriteCard };
