"use client";

import { useTranslations } from "next-intl";

import {
  ServicesMenu,
  type NavService,
} from "@/components/layout/services-menu";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", key: "home" },
  { href: "/usta-ara", key: "workshops" },
] as const;

interface MainNavProps {
  services: readonly NavService[];
}

function MainNav({ services }: MainNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("menu")} className="hidden items-center gap-1 lg:flex">
      {items.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isActive
                ? "text-brand"
                : "text-ink/80 hover:bg-brand-soft hover:text-brand",
            )}
          >
            {t(item.key)}
            {isActive ? (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
            ) : null}
          </Link>
        );
      })}

      <ServicesMenu services={services} />
    </nav>
  );
}

export { MainNav };
