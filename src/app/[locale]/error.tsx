"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { House, RotateCcw, TriangleAlert } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

interface ErrorPageProps {
  error: Error & { digest?: string };
  retry: () => void;
}

function safeDiagnostic(error: Error & { digest?: string }) {
  const redact = (value: string) => value
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/(bearer|token|password)\s*[:=]?\s*\S+/gi, "$1 [redacted]")
    .slice(0, 500);

  return {
    name: error.name,
    message: redact(error.message),
    digest: error.digest,
    pathname: window.location.pathname,
    stack: error.stack
      ?.split("\n")
      .slice(0, 6)
      .map(redact)
      .join("\n"),
  };
}

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  const t = useTranslations("error");
  const nav = useTranslations("nav");

  useEffect(() => {
    console.error("[UstaRotam] Runtime boundary", safeDiagnostic(error));
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="page-container flex h-20 items-center">
        <Logo subtitle={nav("brandSubtitle")} />
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 pb-20"
      >
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert aria-hidden="true" className="size-8" />
          </span>
          <p className="mt-6 text-sm font-bold tracking-[0.18em] text-brand uppercase">
            {t("code")}
          </p>
          <h1 className="mt-2 text-h1 text-ink">{t("title")}</h1>
          <p className="mt-4 text-body-lg text-muted-foreground">
            {t("description")}
          </p>

          {error.digest ? (
            <p className="mt-4 text-xs text-muted-foreground">
              {t("digest")}: <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}

          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button type="button" size="lg" onClick={() => retry()}>
              <RotateCcw aria-hidden="true" />
              {t("retry")}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                <House aria-hidden="true" />
                {t("home")}
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
