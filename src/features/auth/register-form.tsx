"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { useProvinces } from "@/features/catalog/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProvinceSelect } from "@/features/auth/province-select";
import { Link } from "@/i18n/navigation";
import { useApiErrorToast } from "@/lib/toast/use-api-error-toast";

import { passwordIsValid, nameIsValid, phoneIsValid, emailIsValid } from "./registration-validation";

import { RegistrationSuccess } from "./registration-success";
import { getApiErrorMessageKey } from "@/lib/toast/api-error-key";
import { ApiError } from "@/lib/api/errors";
import { LegalDialog } from "./legal-dialog";
import { GoogleOAuthButton } from "./google-oauth-button";

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  province?: string;
  phone?: string;
}

function RegisterForm() {
  const t = useTranslations("auth.register");
  const auth = useTranslations("auth");
  const validation = useTranslations("auth.validation");
  const apiErrors = useTranslations("errors");
  const { register, isRegistering } = useAuth();
  const provinces = useProvinces();
  const showApiError = useApiErrorToast();
  const submitting = useRef(false);
  const [success, setSuccess] = useState<{ email: string; sessionCleared: boolean; deliveryFailed?: boolean } | null>(null);
  const [submitError, setSubmitError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [provinceId, setProvinceId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!nameIsValid(firstName)) nextErrors.firstName = validation("nameLength");
    if (!nameIsValid(lastName)) nextErrors.lastName = validation("nameLength");

    if (!email.trim()) {
      nextErrors.email = validation("emailRequired");
    } else if (!emailIsValid(email)) {
      nextErrors.email = validation("emailInvalid");
    }

    if (!password) {
      nextErrors.password = validation("passwordRequired");
    } else if (!passwordIsValid(password)) {
      nextErrors.password = validation("passwordPolicy");
    }

    if (!confirmPassword) nextErrors.confirmPassword = validation("confirmPasswordRequired");
    else if (password !== confirmPassword) {
      nextErrors.confirmPassword = validation("passwordMismatch");
    }

    if (!terms) {
      nextErrors.terms = validation("termsRequired");
    }
    if (!phoneIsValid(phone)) nextErrors.phone = validation("phoneInvalid");
    if (!provinces.data?.some((province) => province.id === provinceId)) nextErrors.province = validation("provinceRequired");

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current || isRegistering) return;
    if (!validate()) {
      return;
    }

    submitting.current = true;
    setSubmitError("");
    try {
      const registeredEmail = email.trim();
      const result = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        provinceId,
        termsAccepted: true,
        privacyAccepted: true,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      setSuccess({ email: registeredEmail, sessionCleared: result.sessionCleared });
      setPassword(""); setConfirmPassword("");
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_DELIVERY_FAILED") {
        // Backend saves the account before sending the verification email.
        setSuccess({ email: email.trim(), sessionCleared: true, deliveryFailed: true });
        setPassword(""); setConfirmPassword("");
        return;
      }
      setSubmitError(apiErrors(getApiErrorMessageKey(error)));
      showApiError(error, { id: "register-error" });
    } finally { submitting.current = false; }
  }

  if (success) return <RegistrationSuccess {...success} />;

  return (
    <>
      <form onSubmit={handleSubmit} noValidate aria-busy={isRegistering} className="mt-8 space-y-5">
        <fieldset disabled={isRegistering} className="min-w-0 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="register-first-name">{t("firstName")}</Label>
            <Input
              id="register-first-name"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => { setFirstName(event.target.value); setErrors((previous) => ({ ...previous, firstName: undefined })); }}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={
                errors.firstName ? "register-first-name-error" : undefined
              }
            />
            {errors.firstName ? (
              <p
                id="register-first-name-error"
                className="text-xs text-destructive"
              >
                {errors.firstName}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-last-name">{t("lastName")}</Label>
            <Input
              id="register-last-name"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => { setLastName(event.target.value); setErrors((previous) => ({ ...previous, lastName: undefined })); }}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={
                errors.lastName ? "register-last-name-error" : undefined
              }
            />
            {errors.lastName ? (
              <p
                id="register-last-name-error"
                className="text-xs text-destructive"
              >
                {errors.lastName}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">{t("email")}</Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setErrors((previous) => ({ ...previous, email: undefined })); }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? "register-email-error" : undefined
            }
            placeholder={auth("emailPlaceholder")}
          />
          {errors.email ? (
            <p id="register-email-error" className="text-xs text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-phone">{t("phone")}</Label>
          <Input
            id="register-phone"
            name="phone"
            type="tel"
            aria-describedby={errors.phone ? "register-phone-error" : undefined}
            aria-invalid={Boolean(errors.phone)}
            autoComplete="tel"
            value={phone}
            onChange={(event) => { setPhone(event.target.value); setErrors((previous) => ({ ...previous, phone: undefined })); }}
          />
        </div>

        {errors.phone ? <p id="register-phone-error" role="alert" className="text-xs text-destructive">{errors.phone}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="register-province">{t("province")}</Label>
          <ProvinceSelect items={provinces.data ?? []} value={provinceId} onChange={(id) => { setProvinceId(id); setErrors((previous) => ({ ...previous, province: undefined })); }} disabled={provinces.isPending || provinces.isError} invalid={Boolean(errors.province)} />
          {provinces.isError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <span>{t("provinceLoadError")}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void provinces.refetch()} disabled={provinces.isFetching}>
                {t("retryProvince")}
              </Button>
            </div>
          ) : null}
          {errors.province ? <p id="register-province-error" role="alert" className="text-xs text-destructive">{errors.province}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">{t("password")}</Label>
          <div className="relative">
            <Input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setErrors((previous) => ({ ...previous, password: undefined })); }}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "register-password-hint register-password-error" : "register-password-hint"}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? auth("hidePassword") : auth("showPassword")
              }
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
          <p
            id="register-password-hint"
            className="text-xs text-muted-foreground"
          >
            {auth("passwordHint")}
          </p>
          {errors.password ? (
            <p id="register-password-error" role="alert" className="text-xs text-destructive">{errors.password}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-confirm">{t("confirmPassword")}</Label>
          <Input
            id="register-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => { setConfirmPassword(event.target.value); setErrors((previous) => ({ ...previous, confirmPassword: undefined })); }}
            aria-describedby={errors.confirmPassword ? "register-confirm-error" : undefined}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword ? (
            <p id="register-confirm-error" role="alert" className="text-xs text-destructive">
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              name="terms"
              aria-describedby={errors.terms ? "register-terms-error" : undefined}
              checked={terms}
              onChange={(event) => { setTerms(event.target.checked); setErrors((previous) => ({ ...previous, terms: undefined })); }}
              aria-invalid={Boolean(errors.terms)}
              className="mt-0.5 size-4 shrink-0 rounded border-line text-brand accent-brand focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <span><LegalDialog kind="terms" /> {t("legalConnector")} <LegalDialog kind="privacy" /> {t("legalConsent")}</span>
          </label>
          {errors.terms ? (
            <p id="register-terms-error" role="alert" className="mt-1 text-xs text-destructive">{errors.terms}</p>
          ) : null}
        </div>

        {submitError ? <p role="alert" className="text-sm text-destructive">{submitError}</p> : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isRegistering}
        >
          {isRegistering ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : null}
          {t("submit")}
        </Button>
        </fieldset>
      </form>

      <GoogleOAuthButton mode="register" />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link
          href="/giris"
          className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t("loginLink")}
        </Link>
      </p>
    </>
  );
}

export { RegisterForm };
