import { getLocale, getTranslations } from "next-intl/server";
import { X } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getWorkshopSearchQuery } from "@/lib/search-params";
import type { Locale } from "@/types/locale";
import type { WorkshopFilters } from "@/types/search";
import type { Specialty, VehicleType } from "@/types/workshop";
import type { CatalogItem } from "@/lib/api/endpoints/catalog";

interface ActiveFiltersProps {
  filters: WorkshopFilters;
  specialties: readonly Specialty[];
  vehicleTypes: readonly VehicleType[];
  vehicleBrands: readonly CatalogItem[];
}

interface FilterChip {
  key: string;
  label: string;
  query: Record<string, string>;
}

async function ActiveFilters({
  filters,
  specialties,
  vehicleTypes,
  vehicleBrands,
}: ActiveFiltersProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("filters");
  const specialty = specialties.find(
    (item) => item.slug === filters.specialty,
  );
  const vehicleType = vehicleTypes.find(
    (item) => item.slug === filters.vehicleType,
  );
  const vehicleBrand = vehicleBrands.find(
    (item) => item.id === filters.brand || item.slug === filters.brand,
  );
  const chips: FilterChip[] = [];

  if (filters.query) {
    chips.push({
      key: "query",
      label: `“${filters.query}”`,
      query: getWorkshopSearchQuery(filters, { query: "" }),
    });
  }

  if (filters.city) {
    chips.push({
      key: "city",
      label: filters.city,
      query: getWorkshopSearchQuery(filters, { city: "" }),
    });
  }

  if (filters.district) {
    chips.push({
      key: "district",
      label: filters.district,
      query: getWorkshopSearchQuery(filters, { district: "" }),
    });
  }

  if (vehicleBrand) {
    chips.push({
      key: "brand",
      label: vehicleBrand.name,
      query: getWorkshopSearchQuery(filters, { brand: "" }),
    });
  }

  if (specialty) {
    chips.push({
      key: "specialty",
      label: specialty.name[locale],
      query: getWorkshopSearchQuery(filters, { specialty: "" }),
    });
  }

  if (vehicleType) {
    chips.push({
      key: "vehicleType",
      label: vehicleType.name[locale],
      query: getWorkshopSearchQuery(filters, { vehicleType: "" }),
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">
        {t("active")}
      </span>
      <ul aria-label={t("active")} className="contents">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={{ pathname: "/usta-ara", query: chip.query }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold transition-colors hover:border-brand/40 hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={t("removeFilter", { label: chip.label })}
            >
              {chip.label}
              <X aria-hidden="true" className="size-3" />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/usta-ara"
        className="text-xs font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {t("clearAll")}
      </Link>
    </div>
  );
}

export { ActiveFilters };
