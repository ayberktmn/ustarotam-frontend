"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { NotificationIcon } from "@/features/usta-panel/notification-icon";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  usePanelNotifications,
} from "@/features/usta-panel/queries";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WorkshopPanelNotification } from "@/types/usta-panel";
import type { Locale } from "@/types/locale";

function NotificationsView() {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const notifications = usePanelNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unreadCount =
    notifications.data?.filter((item) => !item.read).length ?? 0;

  function handleRead(notification: WorkshopPanelNotification) {
    if (notification.read) {
      return;
    }

    markRead.mutate(notification.id);
  }

  async function handleMarkAll() {
    try {
      await markAll.mutateAsync();
      toast.success(t("notifications.markedAll"));
    } catch {
      toast.error(t("notifications.errors.generic"));
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-ink">{t("notifications.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("notifications.description")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleMarkAll}
          disabled={markAll.isPending || unreadCount === 0}
        >
          <CheckCheck aria-hidden="true" />
          {t("notifications.markAll")}
        </Button>
      </header>

      {notifications.isPending ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      ) : notifications.isError ? (
        <ErrorState
          title={t("notifications.errorTitle")}
          description={t("notifications.errorDescription")}
          retryLabel={t("notifications.retry")}
          onRetry={() => void notifications.refetch()}
        />
      ) : notifications.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
          <Bell
            aria-hidden="true"
            className="mx-auto size-8 text-muted-foreground"
          />
          <p className="mt-3 text-sm font-bold text-ink">
            {t("notifications.emptyTitle")}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t("notifications.emptyDescription")}
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {notifications.data.map((notification) => {
              const translation = `notifications.events.${notification.translationKey}` as const;
              const content = (
                <div className="flex items-start gap-3">
                  <NotificationIcon type={notification.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="break-words text-sm font-bold text-ink">
                        {t(`${translation}.title`)}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateTime(notification.createdAt, locale)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm leading-relaxed text-ink/75">
                      {t(`${translation}.body`)}
                    </p>
                    {!notification.read ? (
                      <Badge variant="secondary" className="mt-2">
                        {t("notifications.unread")}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              );

              return (
                <li
                  key={notification.id}
                  className={cn(
                    "border-b border-line last:border-b-0",
                    !notification.read && "bg-brand-soft/25",
                  )}
                >
                  {notification.href ? (
                    <Link
                      href={notification.href}
                      onClick={() => handleRead(notification)}
                      className="block px-3 py-4 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:px-5"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRead(notification)}
                      className="block w-full px-3 py-4 text-start transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:px-5"
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

export { NotificationsView };
