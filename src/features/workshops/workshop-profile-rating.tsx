"use client";

import { useTranslations } from "next-intl";

import { useWorkshop } from "@/features/workshops/queries";
import { formatRating } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type { Workshop } from "@/types/workshop";

interface WorkshopProfileRatingProps {
  workshop: Workshop;
  locale: Locale;
}

function WorkshopProfileRating({
  workshop,
  locale,
}: WorkshopProfileRatingProps) {
  const t = useTranslations("profile");
  const workshopQuery = useWorkshop(workshop.id);
  const summary = workshopQuery.data ?? workshop;

  return (
    <div className="w-full rounded-2xl border border-line bg-secondary px-5 py-4 sm:w-auto sm:min-w-56">
      <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
        {t("customerRating")}
      </p>
      {summary.rating !== null ? (
        <div className="mt-1.5 flex items-end gap-2">
          <span className="text-4xl leading-none font-extrabold text-ink">
            {formatRating(summary.rating, locale)}
          </span>
          <span className="pb-0.5 text-sm text-muted-foreground">
            {t("outOfFive")}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          {t("noRatingYet")}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {summary.reviewCount > 0
          ? t("reviewCount", { count: summary.reviewCount })
          : t("waitingForReviews")}
      </p>
      {workshopQuery.isError ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {t("ratingRefreshError")}
        </p>
      ) : null}
    </div>
  );
}

export { WorkshopProfileRating };
