import { getTranslations } from "next-intl/server";

import { SpecialtyIcon } from "@/features/workshops/specialty-icon";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/types/locale";
import type { Specialty } from "@/types/workshop";

interface WorkshopSpecialtiesSectionProps {
  specialties: readonly Specialty[];
  locale: Locale;
}

async function WorkshopSpecialtiesSection({
  specialties,
  locale,
}: WorkshopSpecialtiesSectionProps) {
  const t = await getTranslations("workshops");

  return (
    <section aria-labelledby="specialties-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="specialties-title" className="text-h3 text-ink">
          {t("specialties")}
        </h2>
        <Badge variant="outline" className="font-normal">
          {t("serviceCount", { count: specialties.length })}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {specialties.map((specialty) => (
          <div
            key={specialty.slug}
            className="rounded-xl border border-line bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <SpecialtyIcon slug={specialty.slug} className="size-4" />
              </span>
              <h3 className="text-sm font-bold text-ink">
                {specialty.name[locale]}
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {specialty.description[locale]}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export { WorkshopSpecialtiesSection };
