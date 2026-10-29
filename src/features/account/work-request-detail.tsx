"use client";

import { useState } from "react";
import { ArrowLeft, Ban, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { WorkRequestForm } from "@/features/account/work-request-form";
import { Link } from "@/i18n/navigation";
import { ApiError, workRequestService } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/query/keys";
import { canCancelWorkRequest } from "@/lib/work-requests";
import type { Locale } from "@/types/locale";
import type { WorkRequestStatus } from "@/types/work-request";

function WorkRequestDetail({ id }: { id: string }) {
  const t = useTranslations("account.requests");
  const common = useTranslations("common");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryCancel, setRetryCancel] = useState(false);
  const requestKey = queryKeys.workRequests.detail(id);

  const request = useQuery({
    queryKey: requestKey,
    queryFn: ({ signal }) => workRequestService.getById(id, signal),
    retry: false,
  });

  function invalidateRequest() {
    void queryClient.invalidateQueries({ queryKey: requestKey });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workRequests.lists });
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
  });

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
    if (!window.confirm(t("cancelConfirm"))) return;
    setActionError(null);
    setRetryCancel(false);
    cancel.mutate();
  }

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
      {!isEditing ? <div className="flex flex-wrap gap-3">{editable ? <Button type="button" variant="outline" onClick={() => setIsEditing(true)}><Pencil aria-hidden="true" />{t("editRequest")}</Button> : null}{canCancelWorkRequest(item.status) ? <Button type="button" variant="destructive" disabled={cancel.isPending} onClick={confirmCancel}><Ban aria-hidden="true" />{cancel.isPending ? t("cancelling") : t("cancelRequest")}</Button> : null}</div> : null}
      {actionError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"><span>{actionError}</span>{retryCancel ? <Button type="button" variant="link" size="sm" onClick={() => cancel.mutate()}>{common("retry")}</Button> : null}</div> : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{value}</dd></div>;
}

export { WorkRequestDetail };
