"use client";

import {
  Bell,
  BriefcaseBusiness,
  LayoutDashboard,
  MessageSquareText,
  ReceiptText,
  Star,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  usePanelConversations,
  usePanelNotifications,
} from "@/features/usta-panel/queries";

const items = [
  { href: "/usta-panel", key: "overview", icon: LayoutDashboard },
  { href: "/usta-panel/isler", key: "jobs", icon: BriefcaseBusiness },
  { href: "/usta-panel/teklifler", key: "offers", icon: ReceiptText },
  { href: "/usta-panel/mesajlar", key: "messages", icon: MessageSquareText },
  { href: "/usta-panel/bildirimler", key: "notifications", icon: Bell },
  { href: "/usta-panel/yorumlar", key: "reviews", icon: Star },
  { href: "/usta-panel/profil", key: "profile", icon: UserRound },
] as const;

function WorkshopPanelNav() {
  const t = useTranslations("workshopPanel");
  const pathname = usePathname();
  const notifications = usePanelNotifications();
  const conversations = usePanelConversations();

  const notificationCount =
    notifications.data?.filter((item) => !item.read).length ?? 0;
  const messageCount =
    conversations.data?.reduce((sum, item) => sum + item.unreadCount, 0) ?? 0;

  return (
    <nav
      aria-label={t("navLabel")}
      className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-card p-2 shadow-card lg:flex-col lg:overflow-visible"
    >
      {items.map((item) => {
        const isActive =
          item.href === "/usta-panel"
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const badgeCount =
          item.key === "notifications"
            ? notificationCount
            : item.key === "messages"
              ? messageCount
              : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isActive
                ? "bg-brand-soft text-brand-deep"
                : "text-ink/75 hover:bg-muted hover:text-ink",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            <span className="whitespace-nowrap">{t(`nav.${item.key}`)}</span>
            {badgeCount > 0 ? (
              <span
                aria-label={t("nav.unreadCount", { count: badgeCount })}
                className="ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white"
              >
                {badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export { WorkshopPanelNav };
