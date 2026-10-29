import {
  DEFAULT_WORKSHOP_FILTERS,
  WORKSHOP_SORTS,
  type WorkshopFilters,
  type WorkshopSort,
} from "@/types/search";
import { VEHICLE_TYPE_SLUGS, type VehicleTypeSlug } from "@/types/workshop";

export type RawSearchParams = Record<
  string,
  string | string[] | undefined
>;

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function cleanText(value: string | string[] | undefined, maxLength: number) {
  return firstValue(value)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function parseSpecialty(
  value: string | string[] | undefined,
): string {
  const specialty = firstValue(value).trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(specialty) ? specialty.slice(0, 100) : "";
}

function parseBrand(value: string | string[] | undefined): string {
  const brand = firstValue(value).trim();
  return /^[a-zA-Z0-9-]{1,100}$/.test(brand) ? brand : "";
}

function parseVehicleType(
  value: string | string[] | undefined,
): VehicleTypeSlug | "" {
  const vehicleType = firstValue(value);

  return VEHICLE_TYPE_SLUGS.includes(vehicleType as VehicleTypeSlug)
    ? (vehicleType as VehicleTypeSlug)
    : "";
}

function parseSort(value: string | string[] | undefined): WorkshopSort {
  const sort = firstValue(value);

  return WORKSHOP_SORTS.find((supportedSort) => supportedSort === sort)
    ?? DEFAULT_WORKSHOP_FILTERS.sort;
}

function parsePage(value: string | string[] | undefined): number {
  const page = Number(firstValue(value));
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/**
 * URL'den gelen filtreleri doğrular. Bilinmeyen veya desteklenmeyen
 * değerler sessizce varsayılana döner; böylece filtreler her zaman
 * güvenli ve öngörülebilir bir tip taşır.
 */
export function parseWorkshopSearchParams(
  raw: RawSearchParams,
): WorkshopFilters {
  return {
    query: cleanText(raw.q, 100),
    city: cleanText(raw.sehir, 60),
    district: cleanText(raw.ilce, 60),
    brand: parseBrand(raw.marka),
    specialty: parseSpecialty(raw.uzmanlik),
    vehicleType: parseVehicleType(raw.aracTuru),
    minRating: 0,
    minReviewCount: 0,
    sort: parseSort(raw.sirala),
    page: parsePage(raw.sayfa),
  };
}

export function getWorkshopSearchQuery(
  filters: WorkshopFilters,
  overrides: Partial<WorkshopFilters> = {},
): Record<string, string> {
  const changesFilter = Object.keys(overrides).some((key) => key !== "page");
  const next: WorkshopFilters = {
    ...filters,
    ...(changesFilter ? { page: 1 } : {}),
    ...overrides,
  };
  const params = new URLSearchParams();

  if (next.query) {
    params.set("q", next.query);
  }

  if (next.city) {
    params.set("sehir", next.city);
  }

  if (next.district) {
    params.set("ilce", next.district);
  }

  if (next.brand) {
    params.set("marka", next.brand);
  }

  if (next.specialty) {
    params.set("uzmanlik", next.specialty);
  }

  if (next.vehicleType) {
    params.set("aracTuru", next.vehicleType);
  }

  if (next.sort === "yeni") {
    params.set("sirala", next.sort);
  }

  if (next.page > 1) {
    params.set("sayfa", String(next.page));
  }

  return Object.fromEntries(params.entries());
}

export function getActiveFilterCount(filters: WorkshopFilters): number {
  return [
    filters.query,
    filters.city,
    filters.district,
    filters.brand,
    filters.specialty,
    filters.vehicleType,
  ].filter(Boolean).length;
}
