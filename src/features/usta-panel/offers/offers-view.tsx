"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, MapPin, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import {
  usePanelOffers,
  useStartWorkRequest,
  useUpdateOffer,
  useWithdrawOffer,
} from "@/features/usta-panel/queries";
import {
  OfferForm,
  type OfferFormValues,
} from "@/features/usta-panel/offers/offer-form";
import {
  getEffectiveOfferStatus,
  OFFER_STATUS_VARIANT,
} from "@/features/usta-panel/status";
import { panelText } from "@/features/usta-panel/text";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type {
  WorkOfferStatus,
  WorkshopPanelOffer,
} from "@/types/usta-panel";

type OfferFilter = "all" | WorkOfferStatus;

const FILTERS: readonly OfferFilter[] = [
  "all",
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
];

function OffersSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-28 animate-pulse rounded-3xl bg-muted" />
      <div className="h-12 animate-pulse rounded-xl bg-muted" />
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function OffersView() {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const offers = usePanelOffers();
  const startWork = useStartWorkRequest();
  const updateOffer = useUpdateOffer();
  const withdrawOffer = useWithdrawOffer();
  const [filter, setFilter] = useState<OfferFilter>("all");
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [confirmingOfferId, setConfirmingOfferId] = useState<string | null>(
    null,
  );
  const startingRequest = useRef(false);

  if (offers.isPending) {
    return <OffersSkeleton />;
  }

  if (offers.isError) {
    return (
      <ErrorState
        title={t("offers.errorTitle")}
        description={t("offers.errorDescription")}
        retryLabel={t("offers.retry")}
        onRetry={() => void offers.refetch()}
      />
    );
  }

  const counts = FILTERS.reduce<Record<OfferFilter, number>>(
    (accumulator, item) => {
      accumulator[item] =
        item === "all"
          ? offers.data.length
          : offers.data.filter(
              (offer) => getEffectiveOfferStatus(offer) === item,
            ).length;
      return accumulator;
    },
    {
      all: 0,
      SUBMITTED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
      EXPIRED: 0,
    },
  );

  const visible = offers.data.filter(
    (offer) =>
      filter === "all" || getEffectiveOfferStatus(offer) === filter,
  );

  async function handleUpdate(
    offer: WorkshopPanelOffer,
    values: OfferFormValues,
  ) {
    try {
      await updateOffer.mutateAsync({ offerId: offer.id, input: values });
      toast.success(t("offers.updated"));
      setEditingOfferId(null);
    } catch {
      toast.error(t("offers.errors.generic"));
    }
  }

  async function handleWithdraw(offerId: string) {
    try {
      await withdrawOffer.mutateAsync(offerId);
      toast.success(t("offers.withdrawn"));
      setConfirmingOfferId(null);
    } catch {
      toast.error(t("offers.errors.generic"));
    }
  }

  async function handleStart(offer: WorkshopPanelOffer) {
    if (
      startingRequest.current ||
      !window.confirm(t("offers.startConfirm"))
    ) {
      return;
    }

    startingRequest.current = true;
    try {
      await startWork.mutateAsync(offer.requestId);
      toast.success(t("jobs.jobStarted"));
    } catch {
      toast.error(t("jobs.startError"));
    } finally {
      startingRequest.current = false;
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-ink">{t("offers.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("offers.description")}
        </p>
      </header>

      <div
        role="group"
        aria-label={t("offers.filtersLabel")}
        className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-card p-2 shadow-card sm:flex sm:overflow-x-auto"
      >
        {FILTERS.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={filter === item ? "secondary" : "ghost"}
            aria-pressed={filter === item}
            onClick={() => {
              setFilter(item);
              setEditingOfferId(null);
              setConfirmingOfferId(null);
            }}
          >
            {t(`offers.filters.${item}`)}
            <span className="text-xs text-muted-foreground">
              {counts[item]}
            </span>
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
          <p className="text-sm font-bold text-ink">
            {t("offers.emptyTitle")}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t("offers.emptyDescription")}
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/usta-panel/isler">{t("offers.findJobs")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((offer) => {
            const status = getEffectiveOfferStatus(offer);
            const isEditing = editingOfferId === offer.id;
            const isConfirming = confirmingOfferId === offer.id;

            return (
              <Card key={offer.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-h3 text-ink">
                        {offer.request.vehicleLabel}
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin
                            aria-hidden="true"
                            className="size-3.5 text-brand"
                          />
                          {offer.request.city} / {offer.request.district}
                        </span>
                        <span>
                          {panelText(offer.request.specialty, locale)}
                        </span>
                      </p>
                    </div>
                    <Badge variant={OFFER_STATUS_VARIANT[status]}>
                      {t(`offerStatus.${status}`)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {t("offers.amount")}
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-ink">
                        {formatCurrency(
                          offer.amount,
                          offer.currency,
                          locale,
                        )}
                      </p>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock
                        aria-hidden="true"
                        className="size-3.5 text-brand"
                      />
                      {t("offers.expires", {
                        date: formatDate(offer.expiresAt, locale),
                      })}
                    </p>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-ink/80">
                    {offer.description}
                  </p>

                  {offer.status === "ACCEPTED" && offer.request.status ? (
                    <p className="mt-4 rounded-xl border border-brand/20 bg-brand-soft/30 px-4 py-3 text-sm text-ink/80">
                      {t(`jobs.requestStatus.${offer.request.status}`)}
                    </p>
                  ) : null}
                  {offer.request.status &&
                  ["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(
                    offer.request.status,
                  ) &&
                  offer.request.address ? (
                    <p className="mt-3 break-words text-sm text-ink/80">
                      <span className="font-semibold">{t("jobs.address")}: </span>
                      {offer.request.address}
                    </p>
                  ) : null}
                  {status === "ACCEPTED" &&
                  offer.request.status === "ASSIGNED" ? (
                    <Button
                      type="button"
                      className="mt-4 w-full sm:w-auto"
                      disabled={startWork.isPending}
                      onClick={() => void handleStart(offer)}
                    >
                      {startWork.isPending
                        ? t("jobs.startingJob")
                        : t("jobs.startJob")}
                    </Button>
                  ) : null}
                  {status === "ACCEPTED" ? (
                    <p className="mt-4 rounded-xl border border-success/25 bg-success/5 px-4 py-3 text-sm text-ink/80">
                      {t("offers.acceptedNote")}
                    </p>
                  ) : null}

                  {isEditing ? (
                    <OfferForm
                      mode="edit"
                      defaults={{
                        amount: offer.amount,
                        currency: offer.currency,
                        description: offer.description,
                        expiresAt: offer.expiresAt,
                      }}
                      isSubmitting={updateOffer.isPending}
                      onSubmit={(values) => handleUpdate(offer, values)}
                      onCancel={() => setEditingOfferId(null)}
                    />
                  ) : null}
                </CardContent>

                <CardFooter className="flex-col items-stretch justify-between sm:flex-row sm:items-center">
                  <p className="text-xs text-muted-foreground">
                    {t("offers.sent", {
                      date: formatDate(offer.createdAt, locale),
                    })}
                  </p>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {status === "SUBMITTED" ? (
                      <>
                        <Button
                          type="button"
                          variant={isEditing ? "ghost" : "outline"}
                          size="sm"
                          onClick={() =>
                            setEditingOfferId(isEditing ? null : offer.id)
                          }
                        >
                          {isEditing
                            ? t("offerForm.cancel")
                            : t("offers.edit")}
                        </Button>
                        <Button
                          type="button"
                          variant={
                            isConfirming ? "destructive" : "ghost"
                          }
                          size="sm"
                          disabled={withdrawOffer.isPending}
                          onClick={() => {
                            if (isConfirming) {
                              void handleWithdraw(offer.id);
                              return;
                            }

                            setConfirmingOfferId(offer.id);
                          }}
                        >
                          {isConfirming
                            ? t("offers.withdrawConfirm")
                            : t("offers.withdraw")}
                        </Button>
                      </>
                    ) : null}

                    {status === "ACCEPTED" ? (
                      <Button asChild size="sm">
                        <Link href="/usta-panel/mesajlar">
                          <MessageSquareText aria-hidden="true" />
                          {t("offers.messageCustomer")}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { OffersView };
