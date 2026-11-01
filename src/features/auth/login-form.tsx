"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter as useNextRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useResendCooldown } from "./use-resend-cooldown";
import { useAuth } from "@/features/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { readReturnUrl } from "@/lib/return-url";
import { useApiErrorToast } from "@/lib/toast/use-api-error-toast";
import { ApiError } from "@/lib/api/errors";

import { emailIsValid } from "./registration-validation";
import { authPanelPath } from "./panel-path";
import { GoogleOAuthButton } from "./google-oauth-button";
import { getApiErrorMessageKey } from "@/lib/toast/api-error-key";

interface FieldErrors {
  email?: string;
  password?: string;
}

function LoginForm() {
  const t = useTranslations("auth.login");
  const auth = useTranslations("auth");
  const validation = useTranslations("auth.validation");
  const toasts = useTranslations("toasts");
  const apiErrors = useTranslations("errors");
  const submitting = useRef(false);
  const resending = useRef(false);
  const { seconds, start } = useResendCooldown();
  const [resendSent, setResendSent] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { login, resendEmailVerification, isLoggingIn, isLoading } = useAuth();
  const showApiError = useApiErrorToast();
  const router = useRouter();
  const nextRouter = useNextRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!email.trim()) {
      nextErrors.email = validation("emailRequired");
    } else if (!emailIsValid(email)) {
      nextErrors.email = validation("emailInvalid");
    }

    if (!password) {
      nextErrors.password = validation("passwordRequired");
    }

    if (password.length > 128) nextErrors.password = validation("loginPasswordLength");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current || isLoggingIn) return;
    if (!validate()) {
      return;
    }

    submitting.current = true;
    setSubmitError("");
    try {
      setEmailNotVerified(false);
      const session = await login({ email: email.trim(), password, rememberMe });
      toast.success(toasts("loginSuccess"));

      const returnUrl = readReturnUrl();

      if (returnUrl) {
        nextRouter.replace(returnUrl);
      } else {
        router.replace(authPanelPath(session.user));
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "REQUEST_CANCELLED") return;
      if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerified(true);
      }
      setSubmitError(apiErrors(getApiErrorMessageKey(error)));
      showApiError(error, { id: "login-error" });
    } finally { submitting.current = false; }
  }

  async function handleResendVerification() {
    if (!emailIsValid(email) || resending.current || seconds > 0) return;
    resending.current = true;
    setIsResending(true);
    try {
      await resendEmailVerification(email.trim());
      toast.success(toasts("verificationEmailResent"));
      setResendSent(true);
      start();
    } catch (error) {
      start();
      showApiError(error, { id: "verification-resend-error" });
    } finally {
      resending.current = false;
      setIsResending(false);
    }
  }

  return (
    <>
      <form method="post" onSubmit={handleSubmit} noValidate aria-busy={isLoggingIn || isLoading} className="mt-8 space-y-5">
        <fieldset disabled={isLoggingIn || isLoading} className="min-w-0 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login-email">{t("email")}</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setEmailNotVerified(false); setSubmitError(""); setErrors((previous) => ({ ...previous, email: undefined })); }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            placeholder={auth("emailPlaceholder")}
          />
          {errors.email ? (
            <p id="login-email-error" className="text-xs text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="login-password">{t("password")}</Label>
            <Link href="/sifremi-unuttum" className="text-xs font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              {t("forgot")}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setErrors((previous) => ({ ...previous, password: undefined })); }}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
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
          {errors.password ? (
            <p id="login-password-error" className="text-xs text-destructive">
              {errors.password}
            </p>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
          <input type="checkbox" name="rememberMe" checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="size-4 rounded border-line text-brand accent-brand focus-visible:ring-3 focus-visible:ring-ring/50" />
          {t("remember")}
        </label>
        {submitError ? <p role="alert" className="text-sm text-destructive">{submitError}</p> : null}

        <Button type="submit" size="lg" className="w-full" disabled={isLoggingIn}>
          {isLoggingIn ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : null}
          {t("submit")}
        </Button>
        </fieldset>
      </form>

      <GoogleOAuthButton mode="login" />

      {emailNotVerified ? (
        <div role="status" className="mt-5 rounded-xl border border-brand/25 bg-brand-soft p-4 text-sm text-ink">
          <p>{t("emailNotVerified")}</p>
          {resendSent ? <p>{toasts("verificationEmailResent")}</p> : null}
          {seconds > 0 ? <p>{t("resendWait", { seconds })}</p> : null}
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={handleResendVerification}
            disabled={isResending || seconds > 0 || !email.trim()}
          >
            {isResending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {t("resendVerification")}
          </Button>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/kayit"
          className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t("registerLink")}
        </Link>
      </p>
    </>
  );
}

export { LoginForm };
