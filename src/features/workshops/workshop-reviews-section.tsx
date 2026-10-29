"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, MessageSquareText, Send, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { ReviewCard } from "@/features/workshops/review-card";
import { useWorkshopReviews } from "@/features/workshops/queries";
import { Link } from "@/i18n/navigation";
import { reviewService } from "@/lib/api";
import { getReviewCooldownRemainingSeconds } from "@/lib/api/endpoints/reviews";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";
import type { ReviewResolutionStatus } from "@/types/review";
import type { Workshop } from "@/types/workshop";

interface WorkshopReviewsSectionProps {
  workshop: Workshop;
}

type Rating = 1 | 2 | 3 | 4 | 5;

function today(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function StarPicker({ value, onChange, label }: {
  value: Rating;
  onChange: (rating: Rating) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {([1, 2, 3, 4, 5] as const).map((rating) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${rating} / 5`}
          className="rounded-md p-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={() => onChange(rating)}
        >
          <Star
            aria-hidden="true"
            className={cn(
              "size-7",
              rating <= value ? "fill-star text-star" : "text-line",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function formatCooldown(seconds: number, locale: Locale): string {
  const units = [
    { size: 86_400, unit: "day" },
    { size: 3_600, unit: "hour" },
    { size: 60, unit: "minute" },
    { size: 1, unit: "second" },
  ] as const;
  const selected = units.find(({ size }) => seconds >= size) ?? units[3];
  const value = Math.max(1, Math.ceil(seconds / selected.size));

  return new Intl.RelativeTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    numeric: "always",
  }).format(value, selected.unit);
}

function WorkshopReviewForm({ workshop }: WorkshopReviewsSectionProps) {
  const t = useTranslations("workshops.reviewForm");
  const locale = useLocale() as Locale;
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const specialties = workshop.reviewSpecialties ?? [];
  const [rating, setRating] = useState<Rating>(5);
  const [specialtyId, setSpecialtyId] = useState(specialties[0]?.id ?? "");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDate, setServiceDate] = useState(today);
  const [resolutionStatus, setResolutionStatus] = useState<ReviewResolutionStatus>("YES");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitReview = useMutation({
    mutationFn: () => reviewService.create(workshop.id, {
      overallRating: rating,
      serviceDescription,
      serviceDate,
      resolutionStatus,
      comment,
      specialtyRatings: [{ specialtyId, rating }],
    }),
    retry: false,
    onSuccess: (review) => {
      setMessage(
        review.moderationStatus === "PUBLISHED"
          ? t("publishedSuccess")
          : t("pendingSuccess"),
      );
      setErrorMessage(null);
      setRating(5);
      setServiceDescription("");
      setServiceDate(today());
      setResolutionStatus("YES");
      setComment("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.mine });
      if (review.moderationStatus === "PUBLISHED") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.workshops.all,
        });
      }
    },
    onError: (error) => {
      setMessage(null);
      const remaining = getReviewCooldownRemainingSeconds(error);
      setErrorMessage(
        remaining === null
          ? t("submitError")
          : t("cooldown", { duration: formatCooldown(remaining, locale) }),
      );
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    submitReview.mutate();
  }

  if (isLoading) {
    return <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" aria-busy="true" />;
  }

  if (!user) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-muted px-5 py-4 text-sm text-muted-foreground">
        {t("loginPrompt")} {" "}
        <Link href="/giris" className="font-bold text-brand underline-offset-4 hover:underline">
          {t("loginCta")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
      <div>
        <h3 className="text-lg font-bold text-ink">{t("title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("rating")}</Label>
          <StarPicker value={rating} onChange={setRating} label={t("rating")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-specialty">{t("specialty")}</Label>
          <NativeSelect
            id="review-specialty"
            value={specialtyId}
            onChange={(event) => setSpecialtyId(event.target.value)}
            required
            disabled={specialties.length === 0 || submitReview.isPending}
          >
            {specialties.length === 0 ? (
              <option value="">{t("noSpecialty")}</option>
            ) : specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>{specialty.name[locale]}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="review-service">{t("serviceDescription")}</Label>
          <Input
            id="review-service"
            value={serviceDescription}
            onChange={(event) => setServiceDescription(event.target.value)}
            minLength={3}
            maxLength={1000}
            required
            disabled={submitReview.isPending}
            placeholder={t("servicePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-date">{t("serviceDate")}</Label>
          <Input
            id="review-date"
            type="date"
            value={serviceDate}
            max={today()}
            onChange={(event) => setServiceDate(event.target.value)}
            required
            disabled={submitReview.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-resolution">{t("resolutionStatus")}</Label>
          <NativeSelect
            id="review-resolution"
            value={resolutionStatus}
            onChange={(event) => setResolutionStatus(event.target.value as ReviewResolutionStatus)}
            disabled={submitReview.isPending}
          >
            <option value="YES">{t("resolution.YES")}</option>
            <option value="PARTIAL">{t("resolution.PARTIAL")}</option>
            <option value="NO">{t("resolution.NO")}</option>
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-comment">{t("comment")}</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          minLength={3}
          maxLength={5000}
          required
          disabled={submitReview.isPending}
          placeholder={t("commentPlaceholder")}
        />
      </div>

      {message ? <p role="status" className="rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">{message}</p> : null}
      {errorMessage ? <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{errorMessage}</p> : null}

      <Button type="submit" disabled={submitReview.isPending || specialties.length === 0}>
        <Send aria-hidden="true" />
        {submitReview.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

function WorkshopReviewsSection({ workshop }: WorkshopReviewsSectionProps) {
  const t = useTranslations("workshops");
  const common = useTranslations("common");
  const reviews = useWorkshopReviews(workshop.id);
  const count = Number(reviews.data?.meta.total ?? workshop.reviewCount);

  return (
    <section aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-title" className="text-h3 text-ink">{t("reviewsTitle")}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquareText aria-hidden="true" className="size-4" />
          {t("reviewCount", { count })}
        </span>
      </div>

      {reviews.isPending ? (
        <div className="mt-4 space-y-4" aria-busy="true">
          <div className="h-36 animate-pulse rounded-2xl bg-muted" />
          <div className="h-36 animate-pulse rounded-2xl bg-muted" />
          <span className="sr-only">{common("loading")}</span>
        </div>
      ) : reviews.isError ? (
        <ErrorState
          className="mt-4"
          title={t("reviewsErrorTitle")}
          description={t("reviewsErrorDescription")}
          retryLabel={common("retry")}
          onRetry={() => void reviews.refetch()}
        />
      ) : reviews.data.items.length > 0 ? (
        <div className="mt-4 space-y-4">
          {reviews.data.items.map((review) => <ReviewCard key={review.id} review={review} />)}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
          <MessageSquareText aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-bold text-ink">{t("noReviewsTitle")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("noReviewsDescription")}</p>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-muted px-4 py-3 text-xs text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {t("reviewModerationNote")}
      </p>

      <WorkshopReviewForm workshop={workshop} />
    </section>
  );
}

export { WorkshopReviewsSection };
