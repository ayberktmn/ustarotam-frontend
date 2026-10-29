import { getLocale, getTranslations } from "next-intl/server";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilterFormShell } from "@/features/search/filter-form-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Link, getPathname } from "@/i18n/navigation";
import { DEFAULT_WORKSHOP_FILTERS, type WorkshopFilters } from "@/types/search";
import type { Locale } from "@/types/locale";
import type { Specialty, VehicleType } from "@/types/workshop";
import type { CatalogItem } from "@/lib/api/endpoints/catalog";

interface WorkshopFiltersFormProps {
  filters: WorkshopFilters;
  cities: readonly string[];
  districts: readonly string[];
  specialties: readonly Specialty[];
  vehicleTypes: readonly VehicleType[];
  vehicleBrands: readonly CatalogItem[];
  idPrefix: string;
}

async function WorkshopFiltersForm({
  filters,
  cities,
  districts,
  specialties,
  vehicleTypes,
  vehicleBrands,
  idPrefix,
}: WorkshopFiltersFormProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("filters");
  const common = await getTranslations("common");
  const action = getPathname({ locale, href: "/usta-ara" });
  const formKey = JSON.stringify(filters);
  const queryHelpId = `${idPrefix}-q-yardim`;

  return (
    <FilterFormShell
      key={formKey}
      action={action}
      className="space-y-5"
      ariaLabel={t("title")}
    >
      {filters.sort !== DEFAULT_WORKSHOP_FILTERS.sort ? (
        <input type="hidden" name="sirala" value={filters.sort} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-q`}>{t("query")}</Label>
        <Input
          id={`${idPrefix}-q`}
          name="q"
          type="search"
          defaultValue={filters.query}
          placeholder={t("queryPlaceholder")}
          maxLength={100}
          aria-describedby={queryHelpId}
        />
        <p id={queryHelpId} className="text-xs text-muted-foreground">
          {t("queryHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-sehir`}>{common("city")}</Label>
        <NativeSelect
          id={`${idPrefix}-sehir`}
          name="sehir"
          defaultValue={filters.city}
        >
          <option value="">{common("allCities")}</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-ilce`}>{common("district")}</Label>
        <NativeSelect
          id={`${idPrefix}-ilce`}
          name="ilce"
          defaultValue={filters.district}
        >
          <option value="">{common("allDistricts")}</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-marka`}>{t("vehicleBrand")}</Label>
        <NativeSelect
          id={`${idPrefix}-marka`}
          name="marka"
          defaultValue={filters.brand}
        >
          <option value="">{t("allVehicleBrands")}</option>
          {vehicleBrands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-uzmanlik`}>
          {common("serviceCategory")}
        </Label>
        <NativeSelect
          id={`${idPrefix}-uzmanlik`}
          name="uzmanlik"
          defaultValue={filters.specialty}
        >
          <option value="">{common("allSpecialties")}</option>
          {specialties.map((specialty) => (
            <option key={specialty.slug} value={specialty.slug}>
              {specialty.name[locale]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-arac`}>
          {common("vehicleType")}
        </Label>
        <NativeSelect
          id={`${idPrefix}-arac`}
          name="aracTuru"
          defaultValue={filters.vehicleType}
        >
          <option value="">{common("allVehicleTypes")}</option>
          {vehicleTypes.map((vehicleType) => (
            <option key={vehicleType.slug} value={vehicleType.slug}>
              {vehicleType.name[locale]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <Button type="submit" className="w-full">
          <SlidersHorizontal aria-hidden="true" />
          {common("applyFilters")}
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/usta-ara">
            <RotateCcw aria-hidden="true" />
            {common("clearFilters")}
          </Link>
        </Button>
      </div>
    </FilterFormShell>
  );
}

export { WorkshopFiltersForm };
