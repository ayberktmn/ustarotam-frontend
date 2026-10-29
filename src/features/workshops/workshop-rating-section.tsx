import { getTranslations } from "next-intl/server";
import { CircleAlert, Star } from "lucide-react";

import { RatingBreakdown } from "@/features/workshops/rating-breakdown";
import { formatRating } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type { Workshop } from "@/types/workshop";

interface WorkshopRatingSectionProps {
  workshop: Workshop;
  locale: Locale;
}

async function WorkshopRatingSection({
  workshop,
  locale,
}: WorkshopRatingSectionProps) {
  const t = await getTranslations("workshops");
  const hasRating =
    workshop.rating !== null && workshop.ratingBreakdown !== null;

  return (
    <section
      aria-labelledby="rating-title"
      className="rounded-2xl border border-line bg-card p-6 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rating-title" className="text-h3 text-ink">
          {t("ratingTitle")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("criteriaNote")}
        </span>
      </div>

      {hasRating && workshop.ratingBreakdown ? (
        <div className="mt-6 grid gap-8 sm:grid-cols-[170px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted px-4 py-6 text-center">
            <Star aria-hidden="true" className="size-7 fill-star text-star" />
            <p className="mt-2 text-4xl font-extrabold text-ink">
              {formatRating(workshop.rating ?? 0, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("reviewCount", {
                count: workshop.reviewCount,
              })}
            </p>
          </div>
          <RatingBreakdown breakdown={workshop.ratingBreakdown} />
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-muted p-4">
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          />
          <div>
            <p className="text-sm font-semibold text-ink">
              {t("noRatingTitle")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("noRatingDescription")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export { WorkshopRatingSection };
