import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";

import { pickHomeCategories } from "@/features/home/home-content";
import { SpecialtyIcon } from "@/features/workshops/specialty-icon";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";
import type { SpecialtySummary } from "@/types/workshop";

interface HomeCategoriesSectionProps {
  specialtyCards: readonly SpecialtySummary[];
  locale: Locale;
}

async function HomeCategoriesSection({
  specialtyCards,
  locale,
}: HomeCategoriesSectionProps) {
  const t = await getTranslations("home");
  const homeCategories = pickHomeCategories(specialtyCards);

  return (
    <section className="bg-card py-10 lg:py-12">
      <div className="page-container">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
              {t("categories.eyebrow")}
            </p>
            <h2 className="mt-1.5 text-2xl text-ink sm:text-3xl">
              {t("categories.title")}
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("categories.description")}
          </p>
        </div>

        <div className="no-scrollbar mt-6 flex snap-x gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:gap-5 sm:overflow-visible lg:flex-nowrap lg:justify-between lg:gap-2">
          {homeCategories.map((specialty) => (
            <Link
              key={specialty.slug}
              href={{
                pathname: "/usta-ara",
                query: { uzmanlik: specialty.slug },
              }}
              className="group flex w-20 shrink-0 snap-start flex-col items-center gap-2 focus-visible:outline-none"
            >
              <span className="rounded-full bg-gradient-to-tr from-brand via-star to-brand-deep p-0.5 transition-transform duration-200 group-hover:scale-105 group-focus-visible:ring-3 group-focus-visible:ring-ring/50 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-card">
                <span className="block rounded-full bg-card p-1">
                  <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                    <SpecialtyIcon slug={specialty.slug} className="size-5" />
                  </span>
                </span>
              </span>
              <span className="text-center text-[0.7rem] leading-tight font-bold text-ink transition-colors group-hover:text-brand sm:text-xs">
                {specialty.name[locale]}
              </span>
            </Link>
          ))}

          <Link
            href="/hizmetler"
            className="group flex w-20 shrink-0 snap-start flex-col items-center gap-2 focus-visible:outline-none"
          >
            <span className="rounded-full bg-gradient-to-tr from-brand via-star to-brand-deep p-0.5 transition-transform duration-200 group-hover:scale-105 group-focus-visible:ring-3 group-focus-visible:ring-ring/50 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-card">
              <span className="block rounded-full bg-card p-1">
                <span className="flex size-14 items-center justify-center rounded-full bg-brand text-white transition-colors group-hover:bg-brand-dark">
                  <Sparkles aria-hidden="true" className="size-5" />
                </span>
              </span>
            </span>
            <span className="text-center text-[0.7rem] leading-tight font-bold text-brand-deep transition-colors group-hover:text-brand sm:text-xs">
              {t("categories.all")}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export { HomeCategoriesSection };
