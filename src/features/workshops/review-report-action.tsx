"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import { Flag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { isApiError, reviewService } from "@/lib/api";

interface ReviewReportActionProps {
  reviewId: string;
}

function ReviewReportAction({ reviewId }: ReviewReportActionProps) {
  const t = useTranslations("workshops.reviewReport");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reportReview = useMutation({
    mutationFn: (description: string) =>
      reviewService.report(reviewId, description),
    retry: false,
    onSuccess: () => {
      toast.success(t("success"));
      setReason("");
      setErrorMessage(null);
      setOpen(false);
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 401) {
        setErrorMessage(t("errors.loginRequired"));
      } else if (
        isApiError(error) &&
        error.status === 409 &&
        error.code === "REVIEW_ALREADY_REPORTED"
      ) {
        setErrorMessage(t("errors.alreadyReported"));
      } else if (
        isApiError(error) &&
        error.status === 429 &&
        error.code === "REVIEW_RATE_LIMITED"
      ) {
        setErrorMessage(t("errors.rateLimited"));
      } else if (isApiError(error) && error.status === 400) {
        setErrorMessage(t("errors.invalidReason"));
      } else {
        setErrorMessage(t("errors.generic"));
      }
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = reason.trim();
    if (description.length < 3 || description.length > 1000) {
      setErrorMessage(t("errors.invalidReason"));
      return;
    }

    setErrorMessage(null);
    reportReview.mutate(description);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!reportReview.isPending) {
          setOpen(nextOpen);
          if (nextOpen) setErrorMessage(null);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button type="button" variant="ghost" size="xs">
          <Flag aria-hidden="true" />
          {t("trigger")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55 data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[min(85vh,36rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-card p-5 shadow-card focus:outline-none sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-h3 text-ink">
                {t("title")}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t("description")}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("close")}
                disabled={reportReview.isPending}
              >
                <X aria-hidden="true" className="size-5" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor={`review-report-${reviewId}`} className="text-sm font-semibold text-ink">
                {t("reason")}
              </label>
              <Textarea
                id={`review-report-${reviewId}`}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setErrorMessage(null);
                }}
                minLength={3}
                maxLength={1000}
                required
                disabled={reportReview.isPending}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? `review-report-error-${reviewId}` : undefined}
                placeholder={t("placeholder")}
              />
              {errorMessage ? (
                <p
                  id={`review-report-error-${reviewId}`}
                  role="alert"
                  className="text-sm font-semibold text-destructive"
                >
                  {errorMessage}
                  {isApiError(reportReview.error) &&
                  reportReview.error.status === 401 ? (
                    <>
                      {" "}
                      <Link
                        href="/giris"
                        className="underline underline-offset-2"
                      >
                        {t("login")}
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={reportReview.isPending}
                >
                  {t("cancel")}
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={reportReview.isPending}>
                {reportReview.isPending ? t("submitting") : t("submit")}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { ReviewReportAction };
