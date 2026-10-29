"use client";

import {
  BriefcaseBusiness,
  Heart,
  LayoutDashboard,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/features/auth/auth-provider";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { canAccessWorkshopPanel } from "@/lib/workshop-panel-access";

const baseItems = [
  { href: "/hesabim", key: "overview", icon: LayoutDashboard },
  { href: "/hesabim/profil", key: "profile", icon: UserRound },
] as const;

const panelItem = {
  href: "/usta-panel",
  key: "workshopPanel",
  icon: BriefcaseBusiness,
} as const;

const trailingItems = [
  { href: "/hesabim/favoriler", key: "favorites", icon: Heart },
  { href: "/hesabim/yorumlar", key: "reviews", icon: MessageSquareText },
] as const;

function AccountNav() {
  const t = useTranslations("account");
  const pathname = usePathname();
  const { user } = useAuth();
  const items = canAccessWorkshopPanel(user)
    ? [...baseItems, panelItem, ...trailingItems]
    : [...baseItems, ...trailingItems];

  return (
    <nav
      aria-label={t("navLabel")}
      className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-card p-2 shadow-card lg:flex-col lg:overflow-visible"
    >
      {items.map((item) => {
        const isActive =
          item.href === "/hesabim" || item.href === "/usta-panel"
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

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
            {t(`nav.${item.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}

export { AccountNav };
