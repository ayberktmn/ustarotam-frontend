import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Banknote,
  Camera,
  CalendarDays,
  MapPin,
  Ruler,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type {
  WorkshopPanelOffer,
  WorkshopPanelRequest,
} from "@/types/usta-panel";
import { getEffectiveOfferStatus } from "@/features/usta-panel/status";
import { panelText } from "@/features/usta-panel/text";

interface JobCardProps {
  request: WorkshopPanelRequest;
  offer?: WorkshopPanelOffer;
  isEditingOffer: boolean;
  onToggleOffer: () => void;
  children?: ReactNode;
}

function JobCard({
  request,
  offer,
  isEditingOffer,
  onToggleOffer,
  children,
}: JobCardProps) {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const offerStatus = offer ? getEffectiveOfferStatus(offer) : null;
  const canEditOffer = offerStatus === "SUBMITTED";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-h3 text-ink">
              {[request.vehicle.brand, request.vehicle.model]
                .filter(Boolean)
                .join(" ") || panelText(request.vehicle.type, locale)}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {panelText(request.vehicle.type, locale)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Wrench aria-hidden="true" />
              {panelText(request.specialty, locale)}
            </Badge>
            {offerStatus ? (
              <Badge
                variant={
                  offerStatus === "ACCEPTED"
                    ? "success"
                    : offerStatus === "SUBMITTED"
                      ? "secondary"
                      : "outline"
                }
              >
                {t(`offerStatus.${offerStatus}`)}
              </Badge>
            ) : null}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-3.5 text-brand" />
            <dt className="sr-only">{t("jobs.location")}</dt>
            <dd>
              {request.city} / {request.district}
            </dd>
          </div>
          {request.distanceKm !== null ? (
            <div className="flex items-center gap-1.5">
              <Ruler aria-hidden="true" className="size-3.5 text-brand" />
              <dt className="sr-only">{t("jobs.distance")}</dt>
              <dd>{t("jobs.distanceValue", { count: request.distanceKm })}</dd>
            </div>
          ) : null}
          {request.createdAt ? (
            <div className="flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-3.5 text-brand" />
              <dt className="sr-only">{t("jobs.posted")}</dt>
              <dd>{formatDate(request.createdAt, locale)}</dd>
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            <Camera aria-hidden="true" className="size-3.5 text-brand" />
            <dt className="sr-only">{t("jobs.photos")}</dt>
            <dd>{t("jobs.photoCount", { count: request.photoCount })}</dd>
          </div>
        </dl>
      </CardHeader>

      <CardContent>
        {panelText(request.description, locale) ? (
          <p className="break-words text-sm leading-relaxed text-ink/80">
            {panelText(request.description, locale)}
          </p>
        ) : null}
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-brand"
          />
          {t("jobs.privacyNote")}
        </p>
        {children}
      </CardContent>

      <CardFooter className="flex-col items-stretch justify-between sm:flex-row sm:items-center">
        <p className="flex items-center gap-1.5 text-sm text-ink/75">
          <Banknote aria-hidden="true" className="size-4 text-brand" />
          {request.budget ? (
            <span>
              {t("jobs.budget", {
                min: formatCurrency(request.budget.min, "TRY", locale),
                max: formatCurrency(request.budget.max, "TRY", locale),
              })}
            </span>
          ) : (
            <span>{t("jobs.budgetOpen")}</span>
          )}
        </p>

        {offer ? (
          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
            <span className="text-sm font-bold text-ink">
              {formatCurrency(offer.amount, offer.currency, locale)}
            </span>
            {canEditOffer ? (
              <Button
                type="button"
                variant={isEditingOffer ? "ghost" : "outline"}
                size="sm"
                onClick={onToggleOffer}
              >
                {isEditingOffer
                  ? t("offerForm.cancel")
                  : t("jobs.editOffer")}
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href="/usta-panel/teklifler">
                  {t("jobs.viewOffer")}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            variant={isEditingOffer ? "ghost" : "default"}
            onClick={onToggleOffer}
          >
            {isEditingOffer ? t("offerForm.cancel") : t("jobs.giveOffer")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export { JobCard };
