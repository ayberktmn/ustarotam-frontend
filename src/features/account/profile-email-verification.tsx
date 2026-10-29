"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/features/auth/auth-provider";
import { getPathname } from "@/i18n/navigation";
import { authService } from "@/lib/api/endpoints/auth";
import { useResendCooldown } from "@/features/auth/use-resend-cooldown";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionSignal, isSignedOut } from "@/lib/api/token-store";
import { getApiErrorMessageKey } from "@/lib/toast/api-error-key";

export function ProfileEmailVerification({ email, onBusyChange }: {
  email: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const t = useTranslations("account.profile");
  const errors = useTranslations("errors");
  const { logout } = useAuth();
  const locale = useLocale();
  const { seconds, start } = useResendCooldown(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  async function verify() {
    if (pending.current || !/^\d{6}$/.test(code)) return;
    const signal = getSessionSignal();
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      if (signal.aborted || isSignedOut()) return;
      await authService.verifyEmailChange(code);
      if (signal.aborted || isSignedOut()) return;
      try { await logout(); } catch { /* Local auth is cleared by logout even if its request fails. */ }
      window.location.replace(getPathname({ locale, href: "/giris" }));
    } catch (cause) {
      if (!signal.aborted) {
        const key = getApiErrorMessageKey(cause);
        setError(["validation", "verificationInvalid"].includes(key) ? t("codeInvalidOrExpired") : errors(key));
      }
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  async function resend() {
    if (pending.current || seconds > 0) return;
    pending.current = true; setBusy(true); onBusyChange(true); setError("");
    try { await authService.requestEmailChange(email); start(); }
    catch (cause) { setError(errors(getApiErrorMessageKey(cause))); start(); }
    finally { pending.current = false; setBusy(false); onBusyChange(false); }
  }

  return (
    <div className="mt-5 space-y-2 rounded-xl border border-line bg-muted p-4">
      <p role="status" className="text-sm text-muted-foreground">{t("codeSent")}</p>
      <label htmlFor="profile-email-code" className="text-sm font-semibold text-ink">{t("verificationCode")}</label>
      <div className="flex flex-wrap items-center gap-2">
        <Input id="profile-email-code" name="verificationCode" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? "profile-code-error" : undefined} className="min-w-0 flex-1 tracking-widest" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void verify(); } }} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} />
        <Button type="button" size="sm" disabled={busy || !/^\d{6}$/.test(code)} onClick={() => void verify()}>{t(busy ? "verifying" : "verifyCode")}</Button>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={busy || seconds > 0} onClick={() => void resend()}>{t("resendCode")}</Button>
      {seconds > 0 ? <p role="status" className="text-xs text-muted-foreground">{t("resendWait", { seconds })}</p> : null}
      {error ? <p id="profile-code-error" role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
