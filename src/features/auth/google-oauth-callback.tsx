"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import { useRouter } from "@/i18n/navigation";

interface GoogleOAuthCallbackProps {
  status: "success" | "error";
}

function GoogleOAuthCallback({ status }: GoogleOAuthCallbackProps) {
  const t = useTranslations("auth.oauth");
  const auth = useAuth();
  const router = useRouter();
  const requestStarted = useRef(false);

  useEffect(() => {
    if (requestStarted.current) return;
    requestStarted.current = true;

    if (status === "error") {
      toast.error(t("callbackErrorTitle"), {
        description: t("callbackErrorDescription"),
      });
      router.replace("/giris");
      return;
    }

    void auth
      .completeGoogleLogin()
      .then(() => {
        toast.success(t("callbackSuccess"));
        router.replace("/");
      })
      .catch(() => {
        toast.error(t("callbackErrorTitle"), {
          description: t("callbackErrorDescription"),
        });
        router.replace("/giris");
      });
  }, [auth, router, status, t]);

  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-line bg-card p-6 text-center shadow-card sm:p-8" aria-busy="true">
      <Loader2 aria-hidden="true" className="mx-auto size-8 animate-spin text-brand" />
      <h1 className="text-h2 text-ink">{t("callbackLoadingTitle")}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("callbackLoadingDescription")}</p>
      <span className="sr-only">{t("starting")}</span>
    </section>
  );
}

export { GoogleOAuthCallback };
