"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { OfferCurrency } from "@/types/usta-panel";

const amountSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0);

const offerFormSchema = z.object({
  amount: amountSchema,
  currency: z.enum(["TRY", "EUR", "USD"]),
  description: z.string().trim().min(10).max(1000),
  expiresAt: z.string().min(1),
});

export interface OfferFormValues {
  amount: number;
  currency: OfferCurrency;
  description: string;
  expiresAt: string;
}

export interface OfferFormDefaults {
  amount?: number;
  currency?: OfferCurrency;
  description?: string;
  expiresAt?: string;
}

interface OfferFormProps {
  mode: "create" | "edit";
  defaults?: OfferFormDefaults;
  isSubmitting: boolean;
  onSubmit: (values: OfferFormValues) => Promise<void>;
  onCancel: () => void;
}

type FieldErrors = Partial<
  Record<"amount" | "description" | "expiresAt", string>
>;

function toDateInputValue(isoDate: string | undefined): string {
  if (!isoDate) {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().slice(0, 10);
  }

  return isoDate.slice(0, 10);
}

function OfferForm({
  mode,
  defaults,
  isSubmitting,
  onSubmit,
  onCancel,
}: OfferFormProps) {
  const t = useTranslations("workshopPanel");
  const formId = useId();
  const [amount, setAmount] = useState(
    defaults?.amount ? String(defaults.amount) : "",
  );
  const [currency, setCurrency] = useState<OfferCurrency>(
    defaults?.currency ?? "TRY",
  );
  const [description, setDescription] = useState(defaults?.description ?? "");
  const [expiresAt, setExpiresAt] = useState(
    toDateInputValue(defaults?.expiresAt),
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = offerFormSchema.safeParse({
      amount,
      currency,
      description,
      expiresAt,
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      const fields = new Set(
        parsed.error.issues.map((issue) => issue.path[0]),
      );

      if (fields.has("amount")) {
        nextErrors.amount = t("offerForm.errors.amount");
      }

      if (fields.has("description")) {
        nextErrors.description = t("offerForm.errors.description");
      }

      if (fields.has("expiresAt")) {
        nextErrors.expiresAt = t("offerForm.errors.expiresAt");
      }

      setErrors(nextErrors);
      return;
    }

    const expiration = new Date(`${parsed.data.expiresAt}T23:59:59`);

    if (Number.isNaN(expiration.getTime()) || expiration <= new Date()) {
      setErrors({ expiresAt: t("offerForm.errors.expiresAt") });
      return;
    }

    setErrors({});
    await onSubmit({
      amount: Number(parsed.data.amount),
      currency: parsed.data.currency,
      description: parsed.data.description,
      expiresAt: expiration.toISOString(),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-4 rounded-xl border border-brand/20 bg-brand-soft/30 p-4 sm:p-5"
      aria-label={mode === "create" ? t("offerForm.title") : t("offerForm.editTitle")}
    >
      <p className="text-sm font-bold text-ink">
        {mode === "create" ? t("offerForm.title") : t("offerForm.editTitle")}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor={`${formId}-amount`}>
            {t("offerForm.amount")}
          </Label>
          <Input
            id={`${formId}-amount`}
            name="amount"
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={t("offerForm.amountPlaceholder")}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={
              errors.amount ? `${formId}-amount-error` : undefined
            }
            className="mt-1.5"
          />
          {errors.amount ? (
            <p
              id={`${formId}-amount-error`}
              className="mt-1.5 text-xs font-semibold text-destructive"
            >
              {errors.amount}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor={`${formId}-currency`}>
            {t("offerForm.currency")}
          </Label>
          <NativeSelect
            id={`${formId}-currency`}
            name="currency"
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value as OfferCurrency)
            }
            className="mt-1.5"
          >
            <option value="TRY">{t("offerForm.currencies.TRY")}</option>
            <option value="EUR">{t("offerForm.currencies.EUR")}</option>
            <option value="USD">{t("offerForm.currencies.USD")}</option>
          </NativeSelect>
        </div>

        <div>
          <Label htmlFor={`${formId}-expires`}>
            {t("offerForm.expiresAt")}
          </Label>
          <Input
            id={`${formId}-expires`}
            name="expiresAt"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            aria-invalid={Boolean(errors.expiresAt)}
            aria-describedby={
              errors.expiresAt ? `${formId}-expires-error` : undefined
            }
            className="mt-1.5"
          />
          {errors.expiresAt ? (
            <p
              id={`${formId}-expires-error`}
              className="mt-1.5 text-xs font-semibold text-destructive"
            >
              {errors.expiresAt}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor={`${formId}-description`}>
          {t("offerForm.description")}
        </Label>
        <Textarea
          id={`${formId}-description`}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("offerForm.descriptionPlaceholder")}
          maxLength={1000}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description
              ? `${formId}-description-error`
              : `${formId}-description-hint`
          }
          className="mt-1.5"
        />
        {errors.description ? (
          <p
            id={`${formId}-description-error`}
            className="mt-1.5 text-xs font-semibold text-destructive"
          >
            {errors.description}
          </p>
        ) : (
          <p
            id={`${formId}-description-hint`}
            className="mt-1.5 text-xs text-muted-foreground"
          >
            {t("offerForm.descriptionHint")}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Send aria-hidden="true" />
          )}
          {isSubmitting
            ? t("offerForm.submitting")
            : mode === "create"
              ? t("offerForm.submit")
              : t("offerForm.save")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t("offerForm.cancel")}
        </Button>
      </div>
    </form>
  );
}

export { OfferForm };
