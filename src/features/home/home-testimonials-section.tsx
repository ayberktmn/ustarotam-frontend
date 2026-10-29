import { getTranslations } from "next-intl/server";
import { ArrowRight, Wrench, Users, ChartNoAxesColumnIncreasing, ShieldCheck, Sparkles } from "lucide-react";

import { TestimonialCard } from "@/features/testimonials/testimonial-card";
import { Button } from "@/components/ui/button";
import { testimonials } from "@/data/testimonials";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";

interface HomeTestimonialsSectionProps {
  locale: Locale;
}

async function HomeTestimonialsSection({
  locale,
}: HomeTestimonialsSectionProps) {
  const t = await getTranslations("home");

  return (
    <section className="relative overflow-hidden bg-card">
      <div className="page-container pt-10 lg:pt-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            {t("reviews.eyebrow")}
          </p>
          <h2 className="mt-1.5 text-2xl text-ink sm:text-3xl">
            {t("reviews.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("reviews.description")}
          </p>
        </div>

        <div className="relative mt-7">
          <div className="relative max-h-[560px] overflow-hidden">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <TestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  locale={locale}
                />
              ))}
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-card/80 to-card sm:h-48"
            />
          </div>

          <div className="relative z-10 mx-auto -mt-14 flex w-full flex-col items-center pb-16 text-center sm:-mt-16 sm:pb-20">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("reviews.ctaDescription")}
            </p>
            <Button asChild size="lg" className="mt-4">
              <Link href="/usta-ara">
                {t("reviews.ctaButton")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <div className="workshop-join-card mt-8 grid w-full items-center gap-7 rounded-3xl border border-brand/25 p-6 text-left sm:p-8 xl:grid-cols-[120px_minmax(0,1.4fr)_minmax(0,1fr)_auto]">
              <div aria-hidden="true" className="relative mx-auto flex size-28 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-dark text-white shadow-xl">
                <Wrench className="size-20 -rotate-12" strokeWidth={1.6} /><Sparkles className="absolute -top-2 -right-3 size-7 text-brand" />
              </div>
              <div><p className="text-sm font-bold text-brand-deep">{t("reviews.workshopCtaEyebrow")}</p>
                <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t("reviews.workshopCtaTitle")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("reviews.workshopCtaDescription")}</p>
              </div>
              <ul className="grid grid-cols-3 gap-3">{([Users, ChartNoAxesColumnIncreasing, ShieldCheck] as const).map((Icon, index) => <li key={index} className="text-xs font-semibold leading-relaxed text-ink"><span className="mb-2 flex size-12 items-center justify-center rounded-2xl border border-brand/15 bg-card/70 text-brand"><Icon aria-hidden="true" className="size-6" /></span>{t((["reviews.workshopBenefit1", "reviews.workshopBenefit2", "reviews.workshopBenefit3"] as const)[index])}</li>)}</ul>
              <Button asChild variant="premium" size="lg" className="min-h-16 w-full gap-3 px-6 text-base xl:w-auto">
                <Link href="/usta-ol">
                  <Wrench aria-hidden="true" className="size-7" />
                  {t("reviews.workshopCtaButton")}
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { HomeTestimonialsSection };
