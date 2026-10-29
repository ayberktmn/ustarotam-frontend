"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  MessageSquareText,
  ReceiptText,
  Star,
  Trophy,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/features/auth/auth-provider";
import { NotificationIcon } from "@/features/usta-panel/notification-icon";
import {
  usePanelConversations,
  usePanelNotifications,
  usePanelOffers,
  usePanelRequests,
  usePanelReviews,
} from "@/features/usta-panel/queries";
import { panelText } from "@/features/usta-panel/text";
import { Link } from "@/i18n/navigation";
import {
  formatCount,
  formatDate,
  formatRating,
} from "@/lib/format";
import type { Locale } from "@/types/locale";

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

function PanelOverview() {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const requests = usePanelRequests();
  const offers = usePanelOffers();
  const conversations = usePanelConversations();
  const notifications = usePanelNotifications();
  const reviews = usePanelReviews();

  if (requests.isPending || offers.isPending) {
    return <OverviewSkeleton />;
  }

  if (requests.isError || offers.isError || reviews.isError) {
    return (
      <ErrorState
        title={t("overview.errorTitle")}
        description={t("overview.errorDescription")}
        retryLabel={t("overview.retry")}
        onRetry={() => {
          void requests.refetch();
          void offers.refetch();
          void reviews.refetch();
        }}
      />
    );
  }

  const requestList = requests.data;
  const offerList = offers.data;
  const offeredRequestIds = new Set(offerList.map((offer) => offer.requestId));
  const matchingRequests = requestList.filter(
    (request) =>
      request.status === "PUBLISHED" && !offeredRequestIds.has(request.id),
  );
  const pendingOffers = offerList.filter(
    (offer) => offer.status === "SUBMITTED",
  );
  const acceptedOffers = offerList.filter(
    (offer) => offer.status === "ACCEPTED",
  );
  const unreadMessages =
    conversations.data?.reduce((sum, item) => sum + item.unreadCount, 0) ?? 0;
  const unreadNotifications =
    notifications.data?.filter((item) => !item.read).length ?? 0;
  const rating = reviews.data?.summary;

  const stats = [
    {
      key: "matching",
      label: t("overview.stats.matching"),
      value: formatCount(matchingRequests.length, locale),
      icon: BriefcaseBusiness,
      href: "/usta-panel/isler" as const,
    },
    {
      key: "pendingOffers",
      label: t("overview.stats.pendingOffers"),
      value: formatCount(pendingOffers.length, locale),
      icon: ReceiptText,
      href: "/usta-panel/teklifler" as const,
    },
    {
      key: "wonJobs",
      label: t("overview.stats.wonJobs"),
      value: formatCount(acceptedOffers.length, locale),
      icon: Trophy,
      href: "/usta-panel/teklifler" as const,
    },
    {
      key: "rating",
      label: t("overview.stats.rating"),
      value: rating ? formatRating(rating.average, locale) : "—",
      icon: Star,
      href: "/usta-panel/yorumlar" as const,
    },
    {
      key: "unreadMessages",
      label: t("overview.stats.unreadMessages"),
      value: formatCount(unreadMessages, locale),
      icon: MessageSquareText,
      href: "/usta-panel/mesajlar" as const,
    },
  ];

  const recentJobs = matchingRequests.slice(0, 3);
  const recentNotifications = (notifications.data ?? []).slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-line bg-card p-6 shadow-card sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
          {t("overview.eyebrow")}
        </p>
        <h1 className="text-h1 mt-2 text-ink">
          {t("greeting", { name: user?.firstName ?? "" })}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("overview.description")}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Link
              key={stat.key}
              href={stat.href}
              className="group rounded-2xl border border-line bg-card p-5 shadow-card transition-colors hover:border-brand/35 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-muted-foreground">
                  {stat.label}
                </p>
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-ink">
                {stat.value}
              </p>
              {stat.key === "unreadMessages" && unreadNotifications > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("overview.notificationUnread", {
                    count: unreadNotifications,
                  })}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{t("overview.recentJobsTitle")}</CardTitle>
              <CardDescription className="mt-1">
                {t("overview.recentJobsDescription")}
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/usta-panel/isler">
                {t("viewAll")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
                <p className="text-sm font-bold text-ink">
                  {t("overview.noJobsTitle")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("overview.noJobsDescription")}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentJobs.map((request) => (
                  <li key={request.id}>
                    <Link
                      href="/usta-panel/isler"
                      className="block rounded-xl border border-line px-4 py-3 transition-colors hover:border-brand/35 hover:bg-brand-soft/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-bold text-ink">
                          {request.vehicle.year} {request.vehicle.brand}{" "}
                          {request.vehicle.model}
                        </p>
                        <Badge variant="secondary">
                          {panelText(request.specialty, locale)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.city} / {request.district} ·{" "}
                        {formatDate(request.createdAt, locale)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-ink/75">
                        {panelText(request.description, locale)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("overview.ratingTitle")}</CardTitle>
              <CardDescription>
                {t("overview.ratingDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rating ? (
                <div className="flex items-center gap-4">
                  <p className="text-4xl font-extrabold text-ink">
                    {formatRating(rating.average, locale)}
                  </p>
                  <div>
                    <div
                      className="flex items-center gap-0.5"
                      aria-label={t("reviews.averageLabel", {
                        rating: formatRating(rating.average, locale),
                      })}
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          aria-hidden="true"
                          className={
                            index < Math.round(rating.average)
                              ? "size-4 fill-star text-star"
                              : "size-4 text-line"
                          }
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("overview.reviewCount", { count: rating.total })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("overview.noReviews")}
                </p>
              )}
              <Link
                href="/usta-panel/yorumlar"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {t("overview.viewReviews")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>{t("overview.recentNotificationsTitle")}</CardTitle>
                <CardDescription className="mt-1">
                  {t("overview.recentNotificationsDescription")}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/usta-panel/bildirimler">
                  {t("viewAll")}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("overview.noNotifications")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentNotifications.map((notification) => (
                    <li
                      key={notification.id}
                      className="flex items-start gap-3"
                    >
                      <NotificationIcon type={notification.type} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {panelText(notification.title, locale)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {panelText(notification.body, locale)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export { PanelOverview };
