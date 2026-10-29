import { getTranslations } from "next-intl/server";
import { ArrowRight, MapPin, ShieldCheck, Star } from "lucide-react";

import { processSteps } from "@/features/home/home-content";
import { Link } from "@/i18n/navigation";

async function HomeProcessSection() {
  const t = await getTranslations("home");
  const nav = await getTranslations("nav");

  return (
    <section className="bg-secondary py-10 lg:py-12">
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            {t("process.eyebrow")}
          </p>
          <h2 className="mt-1.5 text-2xl text-ink sm:text-3xl">
            {t("process.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("process.description")}
          </p>
          <Link
            href="/nasil-calisir"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {nav("howItWorks")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {processSteps.map((step, index) => (
            <li
              key={step.key}
              className="relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-card"
            >
              <span className="absolute top-4 right-4 text-3xl font-extrabold text-brand/10">
                {step.number}
              </span>
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                {index === 0 ? (
                  <MapPin aria-hidden="true" className="size-4" />
                ) : index === 1 ? (
                  <Star aria-hidden="true" className="size-4" />
                ) : (
                  <ShieldCheck aria-hidden="true" className="size-4" />
                )}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">
                {t(`process.${step.key}Title`)}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t(`process.${step.key}Description`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export { HomeProcessSection };
