import { getTranslations } from "next-intl/server";
import { MapPin, Quote, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";
import type { Testimonial } from "@/types/testimonial";

interface TestimonialCardProps {
  testimonial: Testimonial;
  locale: Locale;
}

async function TestimonialCard({
  testimonial,
  locale,
}: TestimonialCardProps) {
  const t = await getTranslations("home.reviews");

  return (
    <article className="relative flex h-full flex-col rounded-2xl border border-line bg-card p-5 shadow-card">
      <Quote
        aria-hidden="true"
        className="absolute top-4 right-4 size-7 fill-brand/10 text-brand/20"
      />

      <div
        className="flex items-center gap-0.5"
        aria-label={t("ratingLabel", { rating: testimonial.rating })}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            aria-hidden="true"
            className={cn(
              "size-3.5",
              index < testimonial.rating
                ? "fill-star text-star"
                : "text-line",
            )}
          />
        ))}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink/75">
        “{testimonial.quote[locale]}”
      </p>

      <div className="mt-auto flex items-center gap-3 pt-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-deep">
          {testimonial.initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">
            {testimonial.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{testimonial.service[locale]}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-0.5">
              <MapPin aria-hidden="true" className="size-3" />
              {testimonial.location}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

export { TestimonialCard };
