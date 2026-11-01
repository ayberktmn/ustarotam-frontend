"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { getBrowserApiBaseUrl } from "@/lib/api/config";

interface GoogleOAuthButtonProps {
  mode: "login" | "register";
}

function GoogleOAuthButton({ mode }: GoogleOAuthButtonProps) {
  const t = useTranslations("auth.oauth");
  const redirectStarted = useRef(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasError, setHasError] = useState(false);

  function startGoogleOAuth() {
    if (redirectStarted.current) return;
    redirectStarted.current = true;
    setIsRedirecting(true);
    setHasError(false);

    try {
      // OAuth must leave the app for the configured API origin.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href =
        `${getBrowserApiBaseUrl()}/auth/google/start?mode=${mode}`;
    } catch {
      redirectStarted.current = false;
      setIsRedirecting(false);
      setHasError(true);
    }
  }

  return (
    <div className="mt-5 space-y-2">
      <Button
        type="button"
        size="lg"
        variant="outline"
        className="w-full"
        onClick={startGoogleOAuth}
        disabled={isRedirecting}
        aria-busy={isRedirecting}
      >
        {isRedirecting ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
        {isRedirecting ? t("starting") : t("continueWithGoogle")}
      </Button>
      {hasError ? <p role="alert" className="text-sm text-destructive">{t("startError")}</p> : null}
    </div>
  );
}

export { GoogleOAuthButton };
