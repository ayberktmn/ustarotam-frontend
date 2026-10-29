import { getTranslations } from "next-intl/server";

import { phoneHref } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type { Workshop } from "@/types/workshop";

interface WorkshopAboutSectionProps {
  workshop: Workshop;
  locale: Locale;
}

async function WorkshopAboutSection({
  workshop,
  locale,
}: WorkshopAboutSectionProps) {
  const t = await getTranslations("workshops");
  const profileT = await getTranslations("profile");

  return (
    <section
      aria-labelledby="about-title"
      className="rounded-2xl border border-line bg-card p-6 shadow-card"
    >
      <h2 id="about-title" className="text-h3 text-ink">
        {t("aboutTitle")}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {workshop.description[locale] || t("aboutFallback")}
      </p>

      <dl className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {profileT("addressLabel")}
          </dt>
          <dd className="mt-1 text-sm text-ink">{workshop.address}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {profileT("phoneLabel")}
          </dt>
          <dd className="mt-1">
            <a
              href={phoneHref(workshop.phone)}
              className="text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {workshop.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {profileT("locationLabel")}
          </dt>
          <dd className="mt-1 text-sm text-ink">
            {workshop.district}, {workshop.city}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {profileT("statusLabel")}
          </dt>
          <dd className="mt-1 text-sm text-ink">
            {workshop.verificationStatus === "verified"
              ? profileT("verifiedStatus")
              : profileT("pendingStatus")}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export { WorkshopAboutSection };
