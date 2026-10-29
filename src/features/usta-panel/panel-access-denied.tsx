"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

function PanelAccessDenied() {
  const t = useTranslations("workshopPanel");

  return (
    <div className="page-container section-y">
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-card p-8 text-center shadow-card">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <ShieldAlert aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-h2 mt-5 text-ink">{t("access.deniedTitle")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("access.deniedDescription")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/hesabim">{t("access.accountCta")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/usta-ara">{t("access.searchCta")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export { PanelAccessDenied };
