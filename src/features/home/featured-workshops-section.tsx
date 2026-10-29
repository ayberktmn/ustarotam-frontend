import Image from "next/image";
import "./nearby-discovery-card.css";
import { getTranslations } from "next-intl/server";
import { ArrowRight, MapPin } from "lucide-react";

import { WorkshopCard } from "@/features/workshops/workshop-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Specialty, Workshop } from "@/types/workshop";

interface FeaturedWorkshopsSectionProps {
  featuredWorkshops: readonly Workshop[];
  specialties: readonly Specialty[];
}

async function FeaturedWorkshopsSection({
  featuredWorkshops,
  specialties,
}: FeaturedWorkshopsSectionProps) {
  const t = await getTranslations("home");

  return (
    <section className="bg-secondary py-10 lg:py-12">
      <div className="page-container">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
              {t("featured.eyebrow")}
            </p>
            <h2 className="mt-1.5 text-2xl text-ink sm:text-3xl">
              {t("featured.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("featured.description")}
            </p>
          </div>
          <Link
            href="/usta-ara"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {t("featured.viewAll")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredWorkshops.map((workshop) => (
              <WorkshopCard
                key={workshop.id}
                workshop={workshop}
                specialties={specialties}
                compact
              />
            ))}
          </div>

          <aside className={`nearby-discovery-card relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brand/20 bg-card shadow-sm xl:h-full`}>
            <div className="relative z-10 p-5 pb-0">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                <MapPin aria-hidden="true" className="size-4" />
              </span>
              <h2 className="mt-4 text-xl leading-snug font-bold tracking-tight text-ink">
                {t("nearby.title")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("nearby.description")}
              </p>
              <Button asChild size="sm" className="mt-5 w-full justify-between">
                <Link href="/usta-ara">
                  {t("nearby.button")}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div aria-hidden="true" className="nearby-discovery-artwork">
              <div className="nearby-discovery-scene">
                <Image src="/images/nearby-discovery-scene.webp" alt="" width={896} height={400} sizes="(min-width: 1280px) 270px, (min-width: 768px) 420px, 100vw" className="nearby-discovery-road" />
                <Image src="/images/nearby-discovery-pin.webp" alt="" width={185} height={245} sizes="90px" className="nearby-discovery-pin" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export { FeaturedWorkshopsSection };
