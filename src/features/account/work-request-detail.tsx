"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Ban, CalendarClock, Check, Pencil, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { WorkRequestForm } from "@/features/account/work-request-form";
import { WorkRequestReviewForm } from "@/features/account/work-request-review-form";
import { Link } from "@/i18n/navigation";
import { ApiError, workRequestService } from "@/lib/api";
import { formatCurrency, formatCount, formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/query/keys";
import { canCancelWorkRequest } from "@/lib/work-requests";
import type { Locale } from "@/types/locale";
import type { CreateReviewInput } from "@/types/review";
import type { WorkOffer } from "@/types/work-offer";
import type { WorkRequestStatus } from "@/types/work-request";

function WorkRequestDetail({ id }: { id: string }) {
  const t = useTranslations("account.requests");
  const common = useTranslations("common");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryCancel, setRetryCancel] = useState(false);
  const [offerPage, setOfferPage] = useState(1);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewAlreadySubmitted, setReviewAlreadySubmitted] = useState(false);
  const requestActionLock = useRef(false);
  const offerActionLock = useRef(false);
  const requestKey = queryKeys.workRequests.detail(id);

  const request = useQuery({
    queryKey: requestKey,
    queryFn: ({ signal }) => workRequestService.getById(id, signal),
    retry: false,
  });
  const offers = useQuery({
    queryKey: queryKeys.workRequests.offers(id, offerPage, 20),
    queryFn: () => workRequestService.listOffers(id, { page: offerPage, limit: 20 }),
    enabled: Boolean(request.data),
    retry: false,
  });

  function invalidateRequest() {
    void queryClient.invalidateQueries({ queryKey: requestKey });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workRequests.lists });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workRequests.offerLists(id) });
  }

  const update = useMutation({
    mutationFn: (input: Parameters<typeof workRequestService.update>[1]) =>
      workRequestService.update(id, input),
    retry: false,
    onSuccess: (updated) => {
      queryClient.setQueryData(requestKey, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workRequests.lists });
      setIsEditing(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "WORK_REQUEST_NOT_EDITABLE") invalidateRequest();
    },
  });

  function handleCancelError(error: unknown) {
    const message = error instanceof ApiError
      ? error.code === "WORK_REQUEST_NOT_CANCELLABLE"
        ? t("transitionConflict")
        : error.code === "WORK_REQUEST_NOT_FOUND" || error.status === 404
          ? t("notFoundDescription")
          : error.status === 401
            ? t("authenticationRequired")
            : t("actionError")
      : t("actionError");
    setActionError(message);
    setRetryCancel(error instanceof ApiError && error.status !== undefined && error.status >= 500);
    if (error instanceof ApiError && (error.code === "WORK_REQUEST_NOT_CANCELLABLE" || error.status === 404)) {
      invalidateRequest();
    }
  }

  const cancel = useMutation({
    mutationFn: () => workRequestService.cancel(id),
    retry: false,
    onSuccess: (updated) => {
      queryClient.setQueryData(requestKey, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workRequests.lists });
      setActionError(null);
      setRetryCancel(false);
    },
    onError: handleCancelError,
    onSettled: () => {
      requestActionLock.current = false;
    },
  });
  const acceptOffer = useMutation({
    mutationFn: workRequestService.acceptOffer,
    retry: false,
    onSuccess: () => {
      invalidateRequest();
      setActionError(null);
      toast.success(t("offerAcceptSuccess"));
    },
  });
  const rejectOffer = useMutation({
    mutationFn: workRequestService.rejectOffer,
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workRequests.offerLists(id) });
      setActionError(null);
      toast.success(t("offerRejectSuccess"));
    },
  });
  const complete = useMutation({
    mutationFn: () => workRequestService.complete(id),
    retry: false,
    onSuccess: (updated) => {
      queryClient.setQueryData(requestKey, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workRequests.lists });
      setActionError(null);
      toast.success(t("completeSuccess"));
    },
    onError: (error) => {
      setActionError(t("completeError"));
      if (error instanceof ApiError && error.status === 409) invalidateRequest();
    },
    onSettled: () => {
      requestActionLock.current = false;
    },
  });
  const createReview = useMutation({
    mutationFn: (input: CreateReviewInput) => workRequestService.createReview(id, input),
    retry: false,
    onSuccess: () => {
      setReviewSubmitted(true);
      setReviewAlreadySubmitted(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workshops.all });
      toast.success(t("reviewSuccess"));
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "SERVICE_ALREADY_REVIEWED") {
        setReviewAlreadySubmitted(true);
      }
    },
  });

  async function handleOfferDecision(offer: WorkOffer, decision: "accept" | "reject") {
    if (offerActionLock.current || !window.confirm(t(decision === "accept" ? "acceptOfferConfirm" : "rejectOfferConfirm"))) return;
    offerActionLock.current = true;
    setActionError(null);
    try {
      await (decision === "accept" ? acceptOffer.mutateAsync(offer.id) : rejectOffer.mutateAsync(offer.id));
    } catch (error) {
      setActionError(t("offerActionError"));
      if (error instanceof ApiError && error.status === 409) invalidateRequest();
    } finally {
      offerActionLock.current = false;
    }
  }

  async function handleComplete() {
    if (
      requestActionLock.current ||
      complete.isPending ||
      !window.confirm(t("completeConfirm"))
    ) {
      return;
    }

    requestActionLock.current = true;
    complete.mutate();
  }

  if (request.isPending) {
    return <div className="space-y-4" aria-busy="true"><div className="h-12 w-56 animate-pulse rounded-lg bg-muted" /><div className="h-64 animate-pulse rounded-2xl bg-muted" /><span className="sr-only">{common("loading")}</span></div>;
  }

  if (request.isError) {
    if (request.error instanceof ApiError && (request.error.code === "WORK_REQUEST_NOT_FOUND" || request.error.status === 404)) {
      return <section className="space-y-5" role="alert"><h1 className="text-h1 text-ink">{t("notFoundTitle")}</h1><p className="text-sm text-muted-foreground">{t("notFoundDescription")}</p><Button asChild variant="outline"><Link href="/hesabim/talepler"><ArrowLeft aria-hidden="true" />{t("backToList")}</Link></Button></section>;
    }
    return <ErrorState title={t("errorTitle")} description={t("errorDescription")} retryLabel={common("retry")} onRetry={() => void request.refetch()} />;
  }

  const item = request.data;
  const statusVariant = (status: WorkRequestStatus) =>
    status === "PUBLISHED" ? "success" as const : status === "CANCELLED" ? "outline" as const : "secondary" as const;
  const editable = item.status === "DRAFT" || item.status === "PUBLISHED";

  async function saveEdits(input: Parameters<typeof workRequestService.update>[1]) {
    setActionError(null);
    await update.mutateAsync(input);
  }

  function confirmCancel() {
    if (
      requestActionLock.current ||
      cancel.isPending ||
      !window.confirm(t("cancelConfirm"))
    ) {
      return;
    }

    requestActionLock.current = true;
    setActionError(null);
    setRetryCancel(false);
    cancel.mutate();
  }

  const totalOfferPages = offers.data
    ? Math.max(1, offers.data.meta.totalPages ?? Math.ceil((offers.data.meta.total ?? offers.data.items.length) / (offers.data.meta.limit ?? 20)))
    : 1;

  return (
    <div className="space-y-6">
      <Link href="/hesabim/talepler" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><ArrowLeft aria-hidden="true" className="size-4" />{t("backToList")}</Link>
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-h1 text-ink">{t("detailTitle")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("createdAt", { date: formatDate(item.createdAt, locale) })}</p></div><Badge variant={statusVariant(item.status)}>{t(`status.${item.status}`)}</Badge></header>
      <section className="space-y-5 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <h2 className="text-h3 text-ink">{t("requestInformation")}</h2>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <DetailItem label={t("vehicleType")} value={item.vehicleType.name} />
          <DetailItem label={t("vehicleBrand")} value={item.vehicleBrand?.name ?? t("notSpecified")} />
          <DetailItem label={t("vehicleModel")} value={item.vehicleModel?.name ?? t("notSpecified")} />
          <DetailItem label={t("specialty")} value={item.specialty.name} />
          <DetailItem label={t("province")} value={item.province.name} />
          <DetailItem label={t("district")} value={item.district.name} />
          <DetailItem label={t("address")} value={item.address} />
          <DetailItem label={t("description")} value={item.description} />
        </dl>
        {isEditing ? <div className="border-t border-line pt-5"><h3 className="mb-4 text-base font-bold text-ink">{t("editTitle")}</h3><WorkRequestForm key={item.id} initialRequest={item} submitLabel={t("saveChanges")} submittingLabel={t("saving")} onSubmit={saveEdits} /><Button type="button" variant="ghost" className="mt-2" onClick={() => setIsEditing(false)}>{t("discardChanges")}</Button></div> : null}
      </section>
      <section className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <h2 className="text-h3 text-ink">{t("offersTitle")}</h2>
        {offers.isPending ? (
          <p aria-live="polite" className="text-sm text-muted-foreground">{t("offersLoading")}</p>
        ) : offers.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
            <p className="text-sm text-destructive">{t("offersError")}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void offers.refetch()} disabled={offers.isFetching}>{common("retry")}</Button>
          </div>
        ) : offers.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("offersEmpty")}</p>
        ) : (
          <>
            <div className="space-y-3">
              {offers.data.items.map((offer) => {
                const canDecide = item.status === "PUBLISHED" && offer.status === "SUBMITTED";
                const actionPending = acceptOffer.isPending || rejectOffer.isPending;
                return (
                  <article key={offer.id} className="space-y-4 rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xl font-extrabold text-ink">{formatCurrency(offer.amount, offer.currency, locale)}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarClock aria-hidden="true" className="size-3.5 text-brand" />
                          {t("offerExpires", { date: formatDate(offer.expiresAt, locale) })}
                        </p>
                      </div>
                      <Badge variant={offer.status === "ACCEPTED" ? "success" : offer.status === "REJECTED" || offer.status === "EXPIRED" ? "outline" : "secondary"}>
                        {t(`offerStatus.${offer.status}`)}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/80">{offer.description}</p>
                    {canDecide ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="button" className="w-full sm:w-auto" disabled={actionPending} onClick={() => void handleOfferDecision(offer, "accept")}>
                          <Check aria-hidden="true" />
                          {t("acceptOffer")}
                        </Button>
                        <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={actionPending} onClick={() => void handleOfferDecision(offer, "reject")}>
                          <X aria-hidden="true" />
                          {t("rejectOffer")}
                        </Button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
            {totalOfferPages > 1 ? (
              <nav aria-label={t("paginationLabel")} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-sm text-muted-foreground">{t("pageCount", { page: formatCount(offerPage, locale), total: formatCount(totalOfferPages, locale) })}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={offerPage <= 1 || offers.isFetching} onClick={() => setOfferPage((page) => page - 1)}>{t("previousPage")}</Button>
                  <Button type="button" variant="outline" size="sm" disabled={offerPage >= totalOfferPages || offers.isFetching} onClick={() => setOfferPage((page) => page + 1)}>{t("nextPage")}</Button>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </section>
      {!isEditing ? <div className="flex flex-wrap gap-3">{editable ? <Button type="button" variant="outline" onClick={() => setIsEditing(true)}><Pencil aria-hidden="true" />{t("editRequest")}</Button> : null}{item.status === "IN_PROGRESS" ? <Button type="button" disabled={complete.isPending} onClick={handleComplete}>{complete.isPending ? t("completingWork") : t("completeWork")}</Button> : null}{canCancelWorkRequest(item.status) ? <Button type="button" variant="destructive" disabled={cancel.isPending} onClick={confirmCancel}><Ban aria-hidden="true" />{cancel.isPending ? t("cancelling") : t("cancelRequest")}</Button> : null}</div> : null}
      {item.status === "COMPLETED" ? (
        <section className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
          {reviewSubmitted || reviewAlreadySubmitted ? (
            <div role="status" className="rounded-xl border border-success/25 bg-success/5 px-4 py-3 text-sm text-ink">
              {reviewAlreadySubmitted ? t("reviewAlreadySubmitted") : t("reviewSuccess")}
            </div>
          ) : (
            <>
              <header>
                <h2 className="text-h3 text-ink">{t("reviewTitle")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("reviewDescription")}</p>
              </header>
              <WorkRequestReviewForm
                specialtyId={item.specialty.id}
                submitting={createReview.isPending}
                submitLabel={t("submitReview")}
                submittingLabel={t("submittingReview")}
                validationMessage={t("reviewValidation")}
                errorMessage={t("reviewError")}
                onSubmit={(input) => createReview.mutateAsync(input).then(() => undefined)}
              />
            </>
          )}
        </section>
      ) : null}
      {actionError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"><span>{actionError}</span>{retryCancel ? <Button type="button" variant="link" size="sm" onClick={() => cancel.mutate()}>{common("retry")}</Button> : null}</div> : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{value}</dd></div>;
}

export { WorkRequestDetail };
