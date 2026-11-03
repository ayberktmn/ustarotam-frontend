"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck,
  Building2,
  Mail,
  MapPin,
  Phone,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { ProfileForm } from "@/features/usta-panel/profile/profile-form";
import { ServiceAreasEditor } from "@/features/usta-panel/profile/service-areas-editor";
import { BusinessLogoManager } from "@/features/usta-panel/profile/business-logo-manager";
import { BusinessBannerManager } from "@/features/usta-panel/profile/business-banner-manager";
import { WorkshopDocumentsManager } from "@/features/usta-panel/profile/workshop-documents-manager";
import { usePanelProfile } from "@/features/usta-panel/queries";
import { panelText } from "@/features/usta-panel/text";
import { formatRating } from "@/lib/format";
import type { Locale } from "@/types/locale";

function ProfilePanel() {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const profile = usePanelProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingServiceAreas, setIsEditingServiceAreas] = useState(false);

  if (profile.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-28 animate-pulse rounded-3xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (profile.isError) {
    return (
      <ErrorState
        title={t("profile.errorTitle")}
        description={t("profile.errorDescription")}
        retryLabel={t("profile.retry")}
        onRetry={() => void profile.refetch()}
      />
    );
  }

  const data = profile.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-ink">{t("profile.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("profile.description")}
          </p>
        </div>
        {!isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            {t("profile.edit")}
          </Button>
        ) : null}
      </header>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{data.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.ownerName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  data.status === "PUBLISHED" ? "success" : "outline"
                }
              >
                {t(`profile.status.${data.status}`)}
              </Badge>
              <Badge
                variant={
                  data.verification === "VERIFIED"
                    ? "secondary"
                    : "outline"
                }
                className="gap-1.5"
              >
                {data.verification === "VERIFIED" ? (
                  <BadgeCheck aria-hidden="true" />
                ) : null}
                {t(`profile.verification.${data.verification}`)}
              </Badge>
            </div>
          </div>

          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3.5 text-brand" />
              {data.city} / {data.district}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star aria-hidden="true" className="size-3.5 fill-star text-star" />
              {formatRating(data.rating, locale)} ·{" "}
              {t("profile.reviewCount", { count: data.reviewCount })}
            </span>
          </p>
        </CardHeader>

        <CardContent>
          {isEditing ? (
            <ProfileForm
              profile={data}
              onDone={() => setIsEditing(false)}
            />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("profile.email")}
                  </p>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 break-all text-sm font-semibold text-ink">
                    <Mail
                      aria-hidden="true"
                      className="size-3.5 text-brand"
                    />
                    {data.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("profile.phone")}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Phone
                      aria-hidden="true"
                      className="size-3.5 text-brand"
                    />
                    {data.phone}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("profile.about")}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/80">
                  {panelText(data.about, locale)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("profile.address")}
                </p>
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink/80">
                  <Building2
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-brand"
                  />
                  {panelText(data.address, locale)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <CardTitle>{t("profile.specialties")}</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              {t("profile.editSpecialties")}
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {data.specialties.map((specialty) => (
                <li key={specialty.tr}>
                  <Badge variant="secondary">
                    {panelText(specialty, locale)}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <CardTitle>{t("profile.serviceAreas")}</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingServiceAreas(true)}>
              {t("profile.editServiceAreas")}
            </Button>
          </CardHeader>
          <CardContent>
            {data.serviceAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("profile.serviceAreasEmpty")}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {data.serviceAreas.map((area) => (
                  <li
                    key={`${area.city}-${area.district}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-sm text-brand-deep"
                  >
                    <MapPin
                      aria-hidden="true"
                      className="size-3.5 text-brand"
                    />
                    {area.city} / {area.district}
                  </li>
                ))}
              </ul>
            )}
            {isEditingServiceAreas ? <ServiceAreasEditor areas={data.serviceAreas} onDone={() => setIsEditingServiceAreas(false)} /> : null}
          </CardContent>
        </Card>
      </div>

      <BusinessLogoManager name={data.name} logoUrl={data.logoUrl} />
      <BusinessBannerManager name={data.name} bannerUrl={data.bannerUrl} />
      <WorkshopDocumentsManager workshopId={data.id} />
    </div>
  );
}

export { ProfilePanel };
