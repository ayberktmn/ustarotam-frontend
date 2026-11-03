"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareReply, MessageSquareText, Pencil, Star, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { AccountEmptyState } from "@/features/account/account-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { ApiError, reviewService, workshopService } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import type { AccountReviewPreview } from "@/types/account";
import type { Locale } from "@/types/locale";
import type { ReviewModerationStatus } from "@/types/review";

async function loadReviewHistory(): Promise<AccountReviewPreview[]> {
  const reviews = await reviewService.listAllMine(100);
  const workshopIds = [...new Set(reviews.map(({ workshopId }) => workshopId))];
  const workshops = await Promise.all(workshopIds.map(async (id) => {
    try {
      return await workshopService.getById(id);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        return null;
      }

      throw error;
    }
  }));
  const byId = new Map(workshops.flatMap((workshop) => workshop ? [[workshop.id, workshop] as const] : []));

  return reviews.map((review) => {
    const workshop = byId.get(review.workshopId);
    return {
      review,
      workshop: {
        slug: workshop?.slug ?? "",
        name: workshop?.name ?? "",
      },
    };
  });
}

function ReviewStars({ rating, label }: { rating: number; label: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${label}: ${rating} / 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={cn("size-4", index < rating ? "fill-star text-star" : "text-line")}
        />
      ))}
    </div>
  );
}

function statusVariant(status: ReviewModerationStatus) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "REJECTED") return "destructive" as const;
  return status === "PENDING" ? "secondary" as const : "outline" as const;
}

function ReviewsHistory() {
  const t = useTranslations("account");
  const common = useTranslations("common");
  const workshopsT = useTranslations("workshops");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [editComment, setEditComment] = useState("");
  const reviews = useQuery({
    queryKey: queryKeys.reviews.mine,
    queryFn: loadReviewHistory,
    staleTime: 30_000,
  });
  const updateReview = useMutation({
    mutationFn: ({ id }: { id: string }) => reviewService.update(id, {
      overallRating: editRating,
      comment: editComment,
    }),
    retry: false,
    onSuccess: () => {
      setEditingId(null);
      toast.success(t("reviews.updateSuccess"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.mine });
      void queryClient.invalidateQueries({ queryKey: queryKeys.accountBadges });
    },
    onError: () => toast.error(t("reviews.updateError")),
  });
  const deleteReview = useMutation({
    mutationFn: (id: string) => reviewService.remove(id),
    retry: false,
    onSuccess: () => {
      toast.success(t("reviews.deleteSuccess"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.mine });
      void queryClient.invalidateQueries({ queryKey: queryKeys.accountBadges });
    },
    onError: () => toast.error(t("reviews.deleteError")),
  });

  function beginEdit(item: AccountReviewPreview) {
    setEditingId(item.review.id);
    setEditRating(item.review.rating);
    setEditComment(item.review.comment[locale]);
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    updateReview.mutate({ id });
  }

  function handleDelete(id: string) {
    if (window.confirm(t("reviews.deleteConfirm"))) {
      deleteReview.mutate(id);
    }
  }

  if (reviews.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <div className="h-52 animate-pulse rounded-2xl bg-muted" />
        <span className="sr-only">{common("loading")}</span>
      </div>
    );
  }

  if (reviews.isError) {
    return (
      <ErrorState
        title={t("reviews.errorTitle")}
        description={t("reviews.errorDescription")}
        retryLabel={common("retry")}
        onRetry={() => void reviews.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">{t("reviews.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("reviews.description")}</p>
        </div>
        <span className="text-sm font-semibold text-muted-foreground">{t("reviews.count", { count: reviews.data.length })}</span>
      </header>

      {reviews.data.length > 0 ? (
        <div className="space-y-4">
          {reviews.data.map((item) => {
            const { review, workshop } = item;
            const href = workshop.slug
              ? { pathname: "/usta/[slug]" as const, params: { slug: workshop.slug } }
              : null;
            const editable = review.moderationStatus !== "REMOVED" && review.withdrawnAt === null;

            return (
              <article key={review.id} className="rounded-2xl border border-line bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("reviews.workshopLabel")}</p>
                    {href ? (
                      <Link href={href} className="mt-1 block font-bold text-ink transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                        {workshop.name || t("reviews.unknownWorkshop")}
                      </Link>
                    ) : (
                      <span className="mt-1 block font-bold text-ink">
                        {t("reviews.unknownWorkshop")}
                      </span>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(review.createdAt, locale)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ReviewStars rating={review.rating} label={workshopsT("rating")} />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge variant={statusVariant(review.moderationStatus)}>{t(`reviews.status.${review.moderationStatus}`)}</Badge>
                      <Badge variant={review.verificationStatus === "VERIFIED" ? "success" : "outline"}>
                        {review.verificationStatus === "VERIFIED" ? t("reviews.verified") : t("reviews.unverified")}
                      </Badge>
                    </div>
                  </div>
                </div>

                {editingId === review.id ? (
                  <form onSubmit={(event) => handleUpdate(event, review.id)} className="mt-4 space-y-3 rounded-xl bg-muted p-4">
                    <NativeSelect value={editRating} onChange={(event) => setEditRating(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)} aria-label={t("reviews.editRating")}>
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{t("reviews.starOption", { count: rating })}</option>)}
                    </NativeSelect>
                    <Textarea value={editComment} onChange={(event) => setEditComment(event.target.value)} minLength={3} maxLength={5000} required aria-label={t("reviews.editComment")} />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" disabled={updateReview.isPending}>{updateReview.isPending ? t("reviews.saving") : t("reviews.save")}</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>{t("reviews.cancel")}</Button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-ink/75">{review.comment[locale]}</p>
                )}

                {review.ownerReply ? (
                  <div className="mt-4 rounded-xl bg-muted px-4 py-3">
                    <p className="flex items-center gap-2 text-xs font-bold text-ink"><MessageSquareReply aria-hidden="true" className="size-4 text-brand" />{t("reviews.ownerReply")}</p>
                    <p className="mt-2 text-sm text-ink/75">{review.ownerReply.reply}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  {href ? (
                    <Link href={href} className="text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">{t("reviews.viewWorkshop")}</Link>
                  ) : null}
                  {editable ? (
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="xs" onClick={() => beginEdit(item)}><Pencil aria-hidden="true" />{t("reviews.edit")}</Button>
                      <Button type="button" variant="destructive" size="xs" onClick={() => handleDelete(review.id)} disabled={deleteReview.isPending}><Trash2 aria-hidden="true" />{t("reviews.delete")}</Button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <AccountEmptyState
          icon={MessageSquareText}
          title={t("reviews.emptyTitle")}
          description={t("reviews.emptyDescription")}
          action={<Button asChild><Link href="/usta-ara">{t("reviews.searchCta")}</Link></Button>}
        />
      )}
    </div>
  );
}

export { ReviewsHistory };
