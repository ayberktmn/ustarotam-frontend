import { getTranslations } from "next-intl/server";
import { ArrowLeft, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link as LocaleLink } from "@/i18n/navigation";
import { formatCount, formatRating, phoneHref } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type { Workshop } from "@/types/workshop";

interface WorkshopContactAsideProps {
  workshop: Workshop;
  locale: Locale;
}

async function WorkshopContactAside({
  workshop,
  locale,
}: WorkshopContactAsideProps) {
  const t = await getTranslations("workshops");
  const profileT = await getTranslations("profile");

  return (
    <aside aria-label={profileT("profileSummary")} className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-5 shadow-card lg:sticky lg:top-24">
        <h2 className="text-base font-bold text-ink">
          {profileT("contactTitle")}
        </h2>

        <a
          href={phoneHref(workshop.phone)}
          className="mt-4 flex items-start gap-3 rounded-xl border border-line p-3 transition-colors hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={t("callButton")}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Phone aria-hidden="true" className="size-4" />
          </span>
          <span>
            <span className="block text-xs text-muted-foreground">
              {profileT("phoneLabel")}
            </span>
            <span className="mt-0.5 block text-sm font-bold text-ink">
              {workshop.phone}
            </span>
          </span>
        </a>

        <div className="mt-3 flex items-start gap-3 rounded-xl border border-line p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <MapPin aria-hidden="true" className="size-4" />
          </span>
          <span>
            <span className="block text-xs text-muted-foreground">
              {profileT("addressLabel")}
            </span>
            <span className="mt-0.5 block text-sm leading-relaxed text-ink">
              {workshop.address}
            </span>
          </span>
        </div>

        <Button asChild className="mt-4 w-full">
          <a href={phoneHref(workshop.phone)}>
            <Phone aria-hidden="true" />
            {t("callButton")}
          </a>
        </Button>

        <div className="my-5 h-px bg-line" />

        <h3 className="text-sm font-bold text-ink">
          {profileT("profileSummary")}
        </h3>
        <dl className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">
              {profileT("ratingLabel")}
            </dt>
            <dd className="font-semibold text-ink">
              {workshop.rating !== null
                ? `${formatRating(workshop.rating, locale)} / 5`
                : profileT("noRatingYet")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">
              {profileT("reviewsLabel")}
            </dt>
            <dd className="font-semibold text-ink">
              {formatCount(workshop.reviewCount, locale)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">
              {profileT("locationLabel")}
            </dt>
            <dd className="font-semibold text-ink">{workshop.district}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">
              {profileT("recordLabel")}
            </dt>
            <dd className="font-semibold text-ink">
              {workshop.verificationStatus === "verified"
                ? profileT("verifiedShort")
                : profileT("pendingShort")}
            </dd>
          </div>
        </dl>
      </div>

      <Button asChild variant="outline" className="w-full bg-card">
        <LocaleLink href="/usta-ara">
          <ArrowLeft aria-hidden="true" />
          {profileT("backToResults")}
        </LocaleLink>
      </Button>
    </aside>
  );
}

export { WorkshopContactAside };
