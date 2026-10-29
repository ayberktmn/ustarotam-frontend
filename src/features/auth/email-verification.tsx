"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Mail, Loader2 } from "lucide-react";
import { authService } from "@/lib/api/endpoints/auth";
import { getApiErrorMessageKey } from "@/lib/toast/api-error-key";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function EmailVerification({ token }: { token: string | null }): ReactElement {
  const t = useTranslations("auth.emailVerified");
  const errors = useTranslations("errors");
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  // The backend GET verification endpoint redirects here only after consuming
  // a valid token. A token is present only for the supported frontend POST flow.
  const [verified, setVerified] = useState(token === null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Keep a verification secret out of subsequent browser history/referrers.
    const url = new URL(window.location.href);
    if (url.searchParams.has("token")) {
      url.searchParams.delete("token");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  async function confirm(): Promise<void> {
    if (busy.current || !token || verified) return;
    if (token.length < 32 || token.length > 256) { setError(errors("verificationInvalid")); return; }
    busy.current = true; setPending(true); setError("");
    try { await authService.verifyEmail(token); setVerified(true); }
    catch (error) { setError(errors(getApiErrorMessageKey(error))); }
    finally { busy.current = false; setPending(false); }
  }

  return <div className="mx-auto max-w-lg rounded-2xl border border-line bg-card p-6 text-center shadow-card sm:p-10">
    {verified ? <CheckCircle2 aria-hidden="true" className="mx-auto size-12 text-success" /> : <Mail aria-hidden="true" className="mx-auto size-12 text-brand" />}
    <h1 className="mt-5 text-h2 text-ink">{t(verified ? "title" : "pendingTitle")}</h1>
    <p role="status" className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(verified ? "description" : token ? "confirmDescription" : "pendingDescription")}</p>
    {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
    {token && !verified ? <Button type="button" size="lg" className="mt-6 w-full" disabled={pending} onClick={() => void confirm()}>
      {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}{t("confirm")}
    </Button> : null}
    <Button asChild variant={verified ? "default" : "outline"} size="lg" className="mt-4 w-full"><Link href="/giris">{t("login")}</Link></Button>
  </div>;
}
