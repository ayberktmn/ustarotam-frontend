"use client";

import { useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { AccountEmptyState } from "@/features/account/account-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { NativeSelect } from "@/components/ui/native-select";
import { Link } from "@/i18n/navigation";
import { workRequestService } from "@/lib/api";
import { formatCount, formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/query/keys";
import type { Locale } from "@/types/locale";
import { workRequestStatuses, type WorkRequestStatus } from "@/types/work-request";

const PAGE_SIZE = 20;

function WorkRequestsList() {
  const t = useTranslations("account.requests");
  const common = useTranslations("common");
  const locale = useLocale() as Locale;
  const [status, setStatus] = useState<WorkRequestStatus | "">("");
  const [page, setPage] = useState(1);
  const requests = useQuery({
    queryKey: queryKeys.workRequests.list({ status: status || undefined, page, limit: PAGE_SIZE }),
    queryFn: () => workRequestService.listMine({ status: status || undefined, page, limit: PAGE_SIZE }),
    retry: false,
  });
  const header = (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-h1 text-ink">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("description")}</p>
      </div>
      <Button asChild className="w-full sm:w-auto">
        <Link href="/hesabim/talepler/yeni">
          <Plus aria-hidden="true" />
          {t("createCta")}
        </Link>
      </Button>
    </header>
  );

  if (requests.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        {header}
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <span className="sr-only">{common("loading")}</span>
      </div>
    );
  }

  if (requests.isError) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState
          title={t("errorTitle")}
          description={t("errorDescription")}
          retryLabel={common("retry")}
          onRetry={() => void requests.refetch()}
        />
      </div>
    );
  }

  const { items, meta } = requests.data;
  const totalPages = Math.max(
    1,
    meta.totalPages ?? Math.ceil((meta.total ?? items.length) / (meta.limit ?? PAGE_SIZE)),
  );
  const showEmpty = items.length === 0;

  return (
    <div className="space-y-6">
      {header}

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-card p-4 shadow-card">
        <div className="w-full max-w-xs space-y-2">
          <label htmlFor="request-status-filter" className="text-sm font-semibold text-ink">{t("filterLabel")}</label>
          <NativeSelect
            id="request-status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as WorkRequestStatus | "");
              setPage(1);
            }}
          >
            <option value="">{common("all")}</option>
            {workRequestStatuses.map((item) => (
              <option key={item} value={item}>{t(`status.${item}`)}</option>
            ))}
          </NativeSelect>
        </div>
        {meta.total !== undefined ? (
          <p className="text-sm text-muted-foreground">{t("totalCount", { count: formatCount(meta.total, locale) })}</p>
        ) : null}
      </div>

      {showEmpty ? (
        <AccountEmptyState
          icon={ClipboardList}
          title={status ? t("filterEmptyTitle") : t("emptyTitle")}
          description={status ? t("filterEmptyDescription") : t("emptyDescription")}
          action={!status ? (
            <Button asChild>
              <Link href="/hesabim/talepler/yeni">{t("createCta")}</Link>
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {items.map((request) => (
            <article key={request.id} className="rounded-2xl border border-line bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">{t("updatedAt", { date: formatDate(request.updatedAt, locale) })}</p>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">{request.description}</p>
                </div>
                <Badge variant={request.status === "PUBLISHED" ? "success" : request.status === "CANCELLED" ? "outline" : "secondary"}>
                  {t(`status.${request.status}`)}
                </Badge>
              </div>
              <Link
                href={{ pathname: "/hesabim/talepler/[id]", params: { id: request.id } }}
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {t("viewDetails")}
              </Link>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label={t("paginationLabel")} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm text-muted-foreground">{t("pageCount", { page: formatCount(page, locale), total: formatCount(totalPages, locale) })}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1 || requests.isFetching} onClick={() => setPage((current) => current - 1)}>
              {t("previousPage")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= totalPages || requests.isFetching} onClick={() => setPage((current) => current + 1)}>
              {t("nextPage")}
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

export { WorkRequestsList };
