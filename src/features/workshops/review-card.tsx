"use client";

import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, MessageSquareReply, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ReviewReportAction } from "@/features/workshops/review-report-action";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";
import type { WorkshopReview } from "@/types/workshop";

interface ReviewCardProps {
  review: WorkshopReview;
}

function ReviewCard({ review }: ReviewCardProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("workshops");

  return (
    <article className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">{review.authorName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(review.createdAt, locale)}
            {review.vehicle ? ` · ${review.vehicle[locale]}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className="flex items-center gap-0.5"
            aria-label={`${t("rating")}: ${review.rating} / 5`}
          >
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                aria-hidden="true"
                className={cn(
                  "size-4",
                  index < review.rating
                    ? "fill-star text-star"
                    : "text-line",
                )}
              />
            ))}
          </div>
          <Badge
            variant={review.verificationStatus === "VERIFIED" ? "success" : "outline"}
            className="gap-1"
          >
            {review.verificationStatus === "VERIFIED" ? (
              <BadgeCheck aria-hidden="true" />
            ) : null}
            {review.verificationStatus === "VERIFIED"
              ? t("reviewVerified")
              : t("reviewUnverified")}
          </Badge>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink/75">
        {review.comment[locale]}
      </p>

      {review.ownerReply ? (
        <div className="mt-4 rounded-xl bg-muted px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-bold text-ink">
            <MessageSquareReply aria-hidden="true" className="size-4 text-brand" />
            {t("ownerReply")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">
            {review.ownerReply.reply}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <ReviewReportAction reviewId={review.id} />
      </div>
    </article>
  );
}

export { ReviewCard };
