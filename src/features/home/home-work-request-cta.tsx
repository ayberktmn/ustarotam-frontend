import { CarFront, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

async function HomeWorkRequestCta() {
  const t = await getTranslations("home.workRequestCta");

  return (
    <section className="page-container pt-5 sm:pt-6" aria-labelledby="home-work-request-title">
      <div className="flex flex-col gap-5 rounded-2xl border border-brand/20 bg-brand-soft p-5 shadow-card sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex min-w-0 items-start gap-4">
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-brand shadow-xs">
            <CarFront className="size-6" />
          </span>
          <div>
            <h2 id="home-work-request-title" className="text-h3 text-ink">{t("title")}</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
          <Link href="/hesabim/talepler/yeni">
            <Wrench aria-hidden="true" />
            {t("action")}
          </Link>
        </Button>
      </div>
    </section>
  );
}

export { HomeWorkRequestCta };
