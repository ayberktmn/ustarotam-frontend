"use client";

import { ArrowRight, Heart, MailCheck, MailWarning } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { AccountEmptyState } from "@/features/account/account-empty-state";
import { FavoriteCard } from "@/features/account/favorite-card";
import { useAuth } from "@/features/auth/auth-provider";
import { useFavorites } from "@/features/favorites/favorites-provider";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatCount } from "@/lib/format";
import type { Locale } from "@/types/locale";
import type { Workshop } from "@/types/workshop";

interface AccountOverviewProps {
  workshops: readonly Workshop[];
}

function AccountOverview({ workshops }: AccountOverviewProps) {
  const t = useTranslations("account");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const { favoriteIds, isReady } = useFavorites();

  if (!user) {
    return null;
  }

  const favoriteWorkshops = favoriteIds
    .map((id) => workshops.find((workshop) => workshop.id === id))
    .filter((workshop): workshop is Workshop => workshop !== undefined)
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-line bg-card p-6 shadow-card sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-h1 mt-2 text-ink">
          {t("greeting", { name: user.firstName })}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("overview.description")}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">
              {t("overview.favoritesStat")}
            </p>
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Heart aria-hidden="true" className="size-4 fill-brand" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-ink">
            {isReady ? formatCount(favoriteIds.length, locale) : "—"}
          </p>
          <Link
            href="/hesabim/favoriler"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {t("nav.favorites")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

        <section className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">
              {t("overview.statusStat")}
            </p>
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
              {user.emailVerified ? (
                <MailCheck aria-hidden="true" className="size-4" />
              ) : (
                <MailWarning aria-hidden="true" className="size-4" />
              )}
            </span>
          </div>
          <p className="mt-3 text-lg font-extrabold text-ink">
            {user.emailVerified
              ? t("profile.verified")
              : t("profile.unverified")}
          </p>
          <Link
            href="/hesabim/profil"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {t("nav.profile")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3 text-ink">{t("overview.recentFavorites")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("overview.recentFavoritesDescription")}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/hesabim/favoriler">
              {t("nav.favorites")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="mt-4">
          {!isReady ? (
            <div className="space-y-3">
              <div className="h-28 animate-pulse rounded-2xl bg-muted" />
              <div className="h-28 animate-pulse rounded-2xl bg-muted" />
            </div>
          ) : favoriteWorkshops.length > 0 ? (
            <div className="space-y-3">
              {favoriteWorkshops.map((workshop) => (
                <FavoriteCard key={workshop.id} workshop={workshop} />
              ))}
            </div>
          ) : (
            <AccountEmptyState
              icon={Heart}
              title={t("overview.noFavoritesTitle")}
              description={t("overview.noFavoritesDescription")}
              action={
                <Button asChild size="sm">
                  <Link href="/usta-ara">{t("overview.searchCta")}</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

export { AccountOverview };
