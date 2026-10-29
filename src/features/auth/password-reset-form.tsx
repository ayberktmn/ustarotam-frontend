"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { authService } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/errors";
import { getApiErrorMessageKey } from "@/lib/toast/api-error-key";
import { emailIsValid, passwordIsValid } from "./registration-validation";

export function PasswordResetRequestForm(): ReactElement {
  const t = useTranslations("auth.passwordReset");
  const errors = useTranslations("errors");
  const lock = useRef(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (lock.current) return;
    if (!emailIsValid(email)) { setError(t("emailInvalid")); return; }
    lock.current = true; setPending(true); setError("");
    try { await authService.requestPasswordReset(email.trim()); setSent(true); }
    catch (reason) { setError(errors(getApiErrorMessageKey(reason))); }
    finally { lock.current = false; setPending(false); }
  }
  if (sent) return <div role="status" className="space-y-5"><h1 className="text-h2 text-ink">{t("requestSentTitle")}</h1><p className="text-sm text-muted-foreground">{t("requestSentDescription")}</p><Button asChild className="w-full"><Link href="/giris">{t("backToLogin")}</Link></Button></div>;
  return <form onSubmit={submit} noValidate className="space-y-5">
    <div><h1 className="text-h2 text-ink">{t("requestTitle")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("requestDescription")}</p></div>
    <div className="space-y-2"><Label htmlFor="reset-email">{t("email")}</Label><Input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "reset-request-error" : undefined} /></div>
    {error ? <p id="reset-request-error" role="alert" className="text-sm text-destructive">{error}</p> : null}
    <Button type="submit" className="w-full" disabled={pending}>{pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}{t("requestSubmit")}</Button>
    <Button asChild variant="link" className="w-full"><Link href="/giris">{t("backToLogin")}</Link></Button>
  </form>;
}

export function PasswordResetConfirmForm({ initialToken }: { initialToken: string | null }): ReactElement {
  const t = useTranslations("auth.passwordReset");
  const errors = useTranslations("errors");
  const lock = useRef(false);
  const [token, setToken] = useState<string | null>(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("token")) { url.searchParams.delete("token"); window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`); }
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (lock.current) return;
    if (!token || token.length < 32 || token.length > 256) { setError(t("invalidToken")); return; }
    if (!passwordIsValid(password)) { setError(t("passwordInvalid")); return; }
    if (password !== confirm) { setError(t("passwordMismatch")); return; }
    lock.current = true; setPending(true); setError("");
    try { await authService.resetPassword(token, password); setToken(null); setPassword(""); setConfirm(""); setComplete(true); }
    catch (reason) { setError(reason instanceof ApiError && reason.code === "INVALID_VERIFICATION_TOKEN" ? t("invalidToken") : errors(getApiErrorMessageKey(reason))); }
    finally { lock.current = false; setPending(false); }
  }
  if (complete) return <div role="status" className="space-y-5"><h1 className="text-h2 text-ink">{t("successTitle")}</h1><p className="text-sm text-muted-foreground">{t("successDescription")}</p><Button asChild className="w-full"><Link href="/giris">{t("login")}</Link></Button></div>;
  return <form onSubmit={submit} noValidate className="space-y-5">
    <div><h1 className="text-h2 text-ink">{t("confirmTitle")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("confirmDescription")}</p></div>
    <div className="space-y-2"><Label htmlFor="reset-password">{t("newPassword")}</Label><Input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} /></div>
    <div className="space-y-2"><Label htmlFor="reset-confirm">{t("confirmPassword")}</Label><Input id="reset-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => { setConfirm(event.target.value); setError(""); }} /></div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <Button type="submit" className="w-full" disabled={pending || !token}>{pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}{t("confirmSubmit")}</Button>
    {!token ? <p role="alert" className="text-sm text-destructive">{t("invalidToken")}</p> : null}
  </form>;
}
