"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CreateReviewInput } from "@/types/review";

const reviewFormSchema = z.object({
  overallRating: z.number().int().min(1).max(5),
  specialtyRating: z.number().int().min(1).max(5),
  serviceDescription: z.string().trim().min(3).max(1000),
  serviceDate: z.string().refine((value) => {
    const date = new Date(`${value}T00:00:00`);
    return value.length > 0 && !Number.isNaN(date.getTime()) && date <= new Date();
  }),
  amountPaid: z.string().refine((value) => {
    if (!value.trim()) return true;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 && amount <= 9_999_999_999.99;
  }),
  resolutionStatus: z.enum(["YES", "NO", "PARTIAL"]),
  comment: z.string().trim().min(3).max(5000),
});

interface WorkRequestReviewFormProps {
  specialtyId: string;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  validationMessage: string;
  errorMessage: string;
  onSubmit: (input: CreateReviewInput) => Promise<void>;
}

function localDateInputValue(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function WorkRequestReviewForm({
  specialtyId,
  submitting,
  submitLabel,
  submittingLabel,
  validationMessage,
  errorMessage,
  onSubmit,
}: WorkRequestReviewFormProps) {
  const t = useTranslations("account.requests");
  const id = useId();
  const submitLock = useRef(false);
  const [overallRating, setOverallRating] = useState(5);
  const [specialtyRating, setSpecialtyRating] = useState(5);
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDate, setServiceDate] = useState(localDateInputValue);
  const [amountPaid, setAmountPaid] = useState("");
  const [resolutionStatus, setResolutionStatus] =
    useState<CreateReviewInput["resolutionStatus"]>("YES");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || submitting) return;

    const parsed = reviewFormSchema.safeParse({
      overallRating,
      specialtyRating,
      serviceDescription,
      serviceDate,
      amountPaid,
      resolutionStatus,
      comment,
    });

    if (!parsed.success) {
      setError(validationMessage);
      return;
    }

    submitLock.current = true;
    setError(null);
    const [year, month, day] = parsed.data.serviceDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    try {
      await onSubmit({
        overallRating: parsed.data.overallRating as CreateReviewInput["overallRating"],
        serviceDescription: parsed.data.serviceDescription,
        serviceDate: date.toISOString(),
        amountPaid: parsed.data.amountPaid.trim() ? Number(parsed.data.amountPaid) : null,
        resolutionStatus: parsed.data.resolutionStatus,
        comment: parsed.data.comment,
        specialtyRatings: [{
          specialtyId,
          rating: parsed.data.specialtyRating as CreateReviewInput["overallRating"],
        }],
      });
    } catch {
      setError(errorMessage);
    } finally {
      submitLock.current = false;
    }
  }

  function ratingOptions() {
    return [5, 4, 3, 2, 1].map((rating) => (
      <option key={rating} value={rating}>{t("ratingOption", { rating })}</option>
    ));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-overall`}>{t("overallRating")}</Label>
          <NativeSelect id={`${id}-overall`} value={overallRating} onChange={(event) => setOverallRating(Number(event.target.value))}>
            {ratingOptions()}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-specialty`}>{t("specialtyRating")}</Label>
          <NativeSelect id={`${id}-specialty`} value={specialtyRating} onChange={(event) => setSpecialtyRating(Number(event.target.value))}>
            {ratingOptions()}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-service-description`}>{t("serviceDescription")}</Label>
          <Textarea id={`${id}-service-description`} maxLength={1000} value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} placeholder={t("serviceDescriptionPlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-service-date`}>{t("serviceDate")}</Label>
          <Input id={`${id}-service-date`} type="date" max={localDateInputValue()} value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-amount-paid`}>{t("amountPaid")}</Label>
          <Input id={`${id}-amount-paid`} type="number" inputMode="decimal" min="0" max="9999999999.99" step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-resolution`}>{t("resolutionStatus")}</Label>
          <NativeSelect id={`${id}-resolution`} value={resolutionStatus} onChange={(event) => setResolutionStatus(event.target.value as CreateReviewInput["resolutionStatus"])}>
            <option value="YES">{t("resolutionYes")}</option>
            <option value="PARTIAL">{t("resolutionPartial")}</option>
            <option value="NO">{t("resolutionNo")}</option>
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-comment`}>{t("reviewComment")}</Label>
        <Textarea id={`${id}-comment`} maxLength={5000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("reviewCommentPlaceholder")} />
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}

export { WorkRequestReviewForm };
