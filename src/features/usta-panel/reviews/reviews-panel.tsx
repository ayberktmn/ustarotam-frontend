"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, MessageSquareReply, Star } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Textarea } from "@/components/ui/textarea";
import { ReviewReportAction } from "@/features/workshops/review-report-action";
import { usePanelReviews, useReplyToReview } from "@/features/usta-panel/queries";
import { panelText } from "@/features/usta-panel/text";
import { formatDate, formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "size-4",
            index < rating ? "fill-star text-star" : "text-line",
          )}
        />
      ))}
    </div>
  );
}

function ReviewsPanel() {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const reviews = usePanelReviews();
  const replyMutation = useReplyToReview();
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  function startReply(reviewId: string, reply?: string | null) {
    setReplyingId(reviewId);
    setReplyText(reply ?? "");
  }

  function handleReply(event: FormEvent<HTMLFormElement>, reviewId: string) {
    event.preventDefault();
    replyMutation.mutate(
      { reviewId, reply: replyText },
      {
        onSuccess: () => {
          setReplyingId(null);
          setReplyText("");
          toast.success(t("reviews.replySaved"));
        },
        onError: () => toast.error(t("reviews.replyError")),
      },
    );
  }

  if (reviews.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-28 animate-pulse rounded-3xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (reviews.isError) {
    return (
      <ErrorState
        title={t("reviews.errorTitle")}
        description={t("reviews.errorDescription")}
        retryLabel={t("reviews.retry")}
        onRetry={() => void reviews.refetch()}
      />
    );
  }

  const { summary, reviews: items } = reviews.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-ink">{t("reviews.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("reviews.description")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>{t("reviews.averageTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-extrabold text-ink">
                {formatRating(summary.average, locale)}
              </p>
              <div className="pb-1">
                <ReviewStars rating={Math.round(summary.average)} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("reviews.totalCount", { count: summary.total })}
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-2">
              {summary.distribution.map((item) => {
                const percentage =
                  summary.total === 0
                    ? 0
                    : Math.round((item.count / summary.total) * 100);

                return (
                  <li
                    key={item.stars}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-12 shrink-0 text-muted-foreground">
                      {t("reviews.starLabel", { count: item.stars })}
                    </span>
                    <div
                      role="progressbar"
                      aria-label={t("reviews.starLabel", {
                        count: item.stars,
                      })}
                      aria-valuemin={0}
                      aria-valuemax={summary.total}
                      aria-valuenow={item.count}
                      className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-6 text-end font-semibold text-ink">
                      {item.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
              <p className="text-sm font-bold text-ink">
                {t("reviews.emptyTitle")}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {t("reviews.emptyDescription")}
              </p>
            </div>
          ) : (
            items.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-5 sm:pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {review.authorName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(review.serviceDate, locale)} ·{" "}
                        {review.vehicleLabel}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ReviewStars rating={review.rating} />
                      <Badge
                        variant={review.verified ? "success" : "outline"}
                        className="gap-1"
                      >
                        {review.verified ? (
                          <BadgeCheck aria-hidden="true" />
                        ) : null}
                        {review.verified
                          ? t("reviews.verified")
                          : t("reviews.unverified")}
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-ink/80">
                    {panelText(review.comment, locale)}
                  </p>

                  {review.ownerReply && replyingId !== review.id ? (
                    <div className="mt-4 rounded-xl bg-muted px-4 py-3">
                      <p className="flex items-center gap-2 text-xs font-bold text-ink">
                        <MessageSquareReply aria-hidden="true" className="size-4 text-brand" />
                        {t("reviews.yourReply")}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ink/75">
                        {review.ownerReply}
                      </p>
                    </div>
                  ) : null}

                  {replyingId === review.id ? (
                    <form
                      onSubmit={(event) => handleReply(event, review.id)}
                      className="mt-4 space-y-3"
                    >
                      <Textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        minLength={1}
                        maxLength={3000}
                        required
                        disabled={replyMutation.isPending}
                        aria-label={t("reviews.replyLabel")}
                        placeholder={t("reviews.replyPlaceholder")}
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingId(null)}
                          disabled={replyMutation.isPending}
                        >
                          {t("reviews.replyCancel")}
                        </Button>
                        <Button type="submit" size="sm" disabled={replyMutation.isPending}>
                          {replyMutation.isPending
                            ? t("reviews.replySaving")
                            : t("reviews.replySave")}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <ReviewReportAction reviewId={review.id} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => startReply(review.id, review.ownerReply)}
                      >
                        <MessageSquareReply aria-hidden="true" />
                        {review.ownerReply
                          ? t("reviews.editReply")
                          : t("reviews.reply")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export { ReviewsPanel };
