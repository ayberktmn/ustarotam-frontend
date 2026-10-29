import { getTranslations } from "next-intl/server";
import { Compass, House, Search } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const nav = await getTranslations("nav");

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
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Compass aria-hidden="true" className="size-8" />
          </span>
          <p className="mt-6 text-sm font-bold tracking-[0.18em] text-brand uppercase">
            {t("code")}
          </p>
          <h1 className="mt-2 text-h1 text-ink">{t("title")}</h1>
          <p className="mt-4 text-body-lg text-muted-foreground">
            {t("description")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/usta-ara">
                <Search aria-hidden="true" />
                {t("search")}
              </Link>
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
