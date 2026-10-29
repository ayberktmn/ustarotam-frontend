import { getLocale, getTranslations } from "next-intl/server";

import { formatRating } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type { WorkshopRatingBreakdown } from "@/types/workshop";

const criteriaKeys = [
  "quality",
  "priceTransparency",
  "communication",
  "punctuality",
] as const;

const criteriaFields = {
  quality: "serviceQuality",
  priceTransparency: "priceTransparency",
  communication: "communication",
  punctuality: "punctuality",
} as const;

interface RatingBreakdownProps {
  breakdown: WorkshopRatingBreakdown;
}

async function RatingBreakdown({ breakdown }: RatingBreakdownProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("workshops");

  return (
    <ul className="space-y-4">
      {criteriaKeys.map((key) => {
        const value = breakdown[criteriaFields[key]];
        const percentage = Math.min(100, Math.max(0, (value / 5) * 100));

        return (
          <li key={key}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{t(key)}</span>
              <span className="font-bold text-ink">
                {formatRating(value, locale)}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={t(key)}
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={value}
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export { RatingBreakdown };
