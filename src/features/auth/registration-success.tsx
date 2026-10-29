"use client";

import { useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "./auth-provider";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useApiErrorToast } from "@/lib/toast/use-api-error-toast";
import { useResendCooldown } from "./use-resend-cooldown";

export function RegistrationSuccess({ email, sessionCleared, deliveryFailed = false }: { email: string; sessionCleared: boolean; deliveryFailed?: boolean }): ReactElement {
  const t = useTranslations("auth.register");
  const login = useTranslations("auth.login");
  const { resendEmailVerification, logout } = useAuth();
  const showError = useApiErrorToast();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const [clean, setClean] = useState(sessionCleared);
  const { seconds, start } = useResendCooldown();

  async function act(): Promise<void> {
    if (busy.current || (clean && seconds > 0)) return;
    busy.current = true; setPending(true);
    try {
      if (!clean) { await logout(); setClean(true); }
      else { await resendEmailVerification(email); setResent(true); start(); }
    } catch (error) { if (clean) start(); showError(error); }
    finally { busy.current = false; setPending(false); }
  }

  return <section className="mt-8 space-y-4 rounded-xl border border-brand/25 bg-brand-soft p-5" aria-label={t("successTitle")}>
    <CheckCircle2 aria-hidden="true" className="size-8 text-brand" />
    <h2 className="text-lg font-bold text-ink">{t("successTitle")}</h2>
    <p role="status" className="text-sm text-ink">{t(deliveryFailed && !resent ? "deliveryFailed" : "successDescription", { email })}</p>
    {!clean ? <p role="alert" className="text-sm text-destructive">{t("cleanupRequired")}</p> : null}
    {resent ? <p role="status" className="text-sm text-ink">{t("resent")}</p> : null}
    {seconds > 0 ? <p role="status" className="text-sm text-muted-foreground">{t("resendWait", { seconds })}</p> : null}
    <Button type="button" variant="outline" onClick={() => void act()} disabled={pending || (clean && seconds > 0)}>
      {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
      {clean ? login("resendVerification") : t("retryProvince")}
    </Button>
    <Button asChild className="w-full"><Link href="/giris">{t("loginLink")}</Link></Button>
  </section>;
}
