import { getTranslations } from "next-intl/server";
import { Clock, Star } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getWorkshopSearchQuery } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import type { WorkshopFilters, WorkshopSort } from "@/types/search";

const sortOptions = [
  { value: "puan", labelKey: "sortRating", icon: Star },
  { value: "yeni", labelKey: "sortNewest", icon: Clock },
] satisfies {
  value: WorkshopSort;
  labelKey: "sortRating" | "sortNewest";
  icon: typeof Star | typeof Clock;
}[];

interface SearchSortProps {
  filters: WorkshopFilters;
}

async function SearchSort({ filters }: SearchSortProps) {
  const t = await getTranslations("filters");

  return (
    <nav
      aria-label={t("sortLabel")}
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-xs font-semibold text-muted-foreground">
        {t("sortLabel")}
      </span>
      {sortOptions.map((option) => {
        const isActive = filters.sort === option.value;
        const Icon = option.icon;

        return (
          <Link
            key={option.value}
            href={{
              pathname: "/usta-ara",
              query: getWorkshopSearchQuery(filters, { sort: option.value }),
            }}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isActive
                ? "bg-ink text-white"
                : "border border-line bg-card text-muted-foreground hover:bg-brand-soft hover:text-brand",
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            {t(option.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export { SearchSort };
