"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import {
  useCreateOffer,
  usePanelOffers,
  usePanelRequests,
  useUpdateOffer,
} from "@/features/usta-panel/queries";
import { JobCard } from "@/features/usta-panel/jobs/job-card";
import {
  OfferForm,
  type OfferFormValues,
} from "@/features/usta-panel/offers/offer-form";
import {
  getEffectiveOfferStatus,
  matchesJobFilter,
  type JobFilter,
} from "@/features/usta-panel/status";
import {
  WorkshopPanelError,
} from "@/lib/repositories/workshop-panel-repository";
import type {
  WorkshopPanelOffer,
  WorkshopPanelRequest,
} from "@/types/usta-panel";

const FILTERS: readonly JobFilter[] = ["all", "offered", "won", "closed"];

function JobsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-28 animate-pulse rounded-3xl bg-muted" />
      <div className="h-12 animate-pulse rounded-xl bg-muted" />
      <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      <div className="h-56 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function JobsView() {
  const t = useTranslations("workshopPanel");
  const requests = usePanelRequests();
  const offers = usePanelOffers();
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const [filter, setFilter] = useState<JobFilter>("all");
  const [editingRequestId, setEditingRequestId] = useState<string | null>(
    null,
  );

  if (requests.isPending || offers.isPending) {
    return <JobsSkeleton />;
  }

  if (requests.isError || offers.isError) {
    return (
      <ErrorState
        title={t("jobs.errorTitle")}
        description={t("jobs.errorDescription")}
        retryLabel={t("jobs.retry")}
        onRetry={() => {
          void requests.refetch();
          void offers.refetch();
        }}
      />
    );
  }

  const offerByRequest = new Map(
    offers.data.map((offer) => [offer.requestId, offer]),
  );
  const counts = FILTERS.reduce<Record<JobFilter, number>>(
    (accumulator, item) => {
      accumulator[item] = requests.data.filter((request) =>
        matchesJobFilter(request, offerByRequest.get(request.id), item),
      ).length;
      return accumulator;
    },
    { all: 0, offered: 0, won: 0, closed: 0 },
  );
  const visible = requests.data.filter((request) =>
    matchesJobFilter(request, offerByRequest.get(request.id), filter),
  );

  function resolveError(error: unknown): string {
    if (error instanceof WorkshopPanelError) {
      if (error.code === "OFFER_ALREADY_EXISTS") {
        return t("jobs.errors.alreadyExists");
      }

      if (error.code === "OFFER_NOT_EDITABLE") {
        return t("jobs.errors.notEditable");
      }

      if (error.code === "REQUEST_NOT_AVAILABLE") {
        return t("jobs.errors.notAvailable");
      }
    }

    return t("jobs.errors.generic");
  }

  async function handleSubmit(
    request: WorkshopPanelRequest,
    offer: WorkshopPanelOffer | undefined,
    values: OfferFormValues,
  ) {
    try {
      if (offer) {
        await updateOffer.mutateAsync({
          offerId: offer.id,
          input: values,
        });
        toast.success(t("jobs.offerUpdated"));
      } else {
        await createOffer.mutateAsync({
          requestId: request.id,
          ...values,
        });
        toast.success(t("jobs.offerSent"));
      }

      setEditingRequestId(null);
    } catch (error) {
      toast.error(resolveError(error));
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-ink">{t("jobs.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("jobs.description")}
        </p>
      </header>

      <div
        role="group"
        aria-label={t("jobs.filtersLabel")}
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
              setEditingRequestId(null);
            }}
            className="min-w-0"
          >
            {t(`jobs.filters.${item}`)}
            <span className="text-xs text-muted-foreground">
              {counts[item]}
            </span>
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
          <p className="text-sm font-bold text-ink">
            {t(`jobs.empty.${filter}.title`)}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t(`jobs.empty.${filter}.description`)}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((request) => {
            const offer = offerByRequest.get(request.id);
            const isEditing = editingRequestId === request.id;

            return (
              <JobCard
                key={request.id}
                request={request}
                offer={offer}
                isEditingOffer={isEditing}
                onToggleOffer={() => {
                  const canOffer =
                    !offer || getEffectiveOfferStatus(offer) === "SUBMITTED";

                  if (!canOffer) {
                    return;
                  }

                  setEditingRequestId(isEditing ? null : request.id);
                }}
              >
                {isEditing && (!offer ||
                  getEffectiveOfferStatus(offer) === "SUBMITTED") ? (
                  <OfferForm
                    key={`${request.id}-${offer?.id ?? "new"}`}
                    mode={offer ? "edit" : "create"}
                    defaults={
                      offer
                        ? {
                            amount: offer.amount,
                            currency: offer.currency,
                            description: offer.description,
                            expiresAt: offer.expiresAt,
                          }
                        : undefined
                    }
                    isSubmitting={
                      createOffer.isPending || updateOffer.isPending
                    }
                    onSubmit={(values) =>
                      handleSubmit(request, offer, values)
                    }
                    onCancel={() => setEditingRequestId(null)}
                  />
                ) : null}
              </JobCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { JobsView };
