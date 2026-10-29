"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronDown } from "lucide-react";

import { SpecialtyIcon } from "@/features/workshops/specialty-icon";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { SpecialtySlug } from "@/types/workshop";

export interface NavService {
  slug: SpecialtySlug;
  name: string;
}

const featuredSlugs: readonly SpecialtySlug[] = [
  "motor-mekanigi",
  "periyodik-bakim",
  "oto-elektrik",
  "fren-yuruyen",
  "klima",
  "kaporta-boya",
  "lastik",
  "sanziman",
];

interface ServicesMenuProps {
  services: readonly NavService[];
}

function ServicesMenu({ services }: ServicesMenuProps) {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);

  const isActive = pathname.startsWith("/hizmetler");

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const items = featuredSlugs.flatMap((slug) => {
    const service = services.find((item) => item.slug === slug);
    return service ? [service] : [];
  });

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!containerRef.current?.contains(document.activeElement)) {
          setOpen(false);
        }
      }}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <Link
        ref={triggerRef}
        href="/hizmetler"
        aria-expanded={open}
        aria-controls="services-menu"
        className={cn(
          "relative inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          isActive || open
            ? "text-brand"
            : "text-ink/80 hover:bg-brand-soft hover:text-brand",
        )}
      >
        {t("services")}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 text-current transition-transform duration-200",
            open && "rotate-180",
          )}
        />
        {isActive ? (
          <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
        ) : null}
      </Link>

      <div
        id="services-menu"
        role="group"
        aria-label={t("servicesMenu")}
        className={cn(
          "absolute top-full right-0 z-50 w-[34rem] pt-2 transition-[opacity,transform,visibility] duration-200 ease-out",
          open
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="rounded-2xl border border-line bg-card p-2 shadow-xl ring-1 ring-ink/5">
          <div className="grid grid-cols-2 gap-0.5">
            {items.map((service) => (
              <Link
                key={service.slug}
                href={{
                  pathname: "/usta-ara",
                  query: { uzmanlik: service.slug },
                }}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <SpecialtyIcon slug={service.slug} className="size-4" />
                </span>
                <span className="text-sm font-semibold text-ink transition-colors group-hover:text-brand-deep">
                  {service.name}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-1 border-t border-line pt-1">
            <Link
              href="/hizmetler"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-brand transition-colors hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {common("allSpecialties")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ServicesMenu };
