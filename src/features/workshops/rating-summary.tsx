import { getLocale, getTranslations } from "next-intl/server";
import { Star } from "lucide-react";

import { formatCount, formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

interface RatingSummaryProps {
  rating: number | null;
  reviewCount: number;
  className?: string;
  showCount?: boolean;
}

async function RatingSummary({
  rating,
  reviewCount,
  className,
  showCount = true,
}: RatingSummaryProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("workshops");

  if (rating === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
          className,
        )}
      >
        <Star aria-hidden="true" className="size-4" />
        {t("noRating")}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`${t("rating")}: ${formatRating(rating, locale)} / 5${
        showCount ? `, ${formatCount(reviewCount, locale)} ${t("reviews")}` : ""
      }`}
    >
      <Star
        aria-hidden="true"
        className="size-4 fill-star text-star"
      />
      <span className="text-sm font-bold">{formatRating(rating, locale)}</span>
      {showCount ? (
        <span className="text-sm text-muted-foreground">
          ({formatCount(reviewCount, locale)})
        </span>
      ) : null}
    </span>
  );
}

export { RatingSummary };
