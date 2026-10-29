import "server-only";

import { cache } from "react";

import { serverCatalogService, serverWorkshopService } from "@/lib/api/server";
import type { CatalogItem } from "@/lib/api/endpoints/catalog";
import type { Locale } from "@/types/locale";
import type {
  WorkshopFilters,
  WorkshopSearchResult,
} from "@/types/search";
import type { Specialty, SpecialtySummary, VehicleType, Workshop } from "@/types/workshop";

async function catalogIdByName(items: { id: string; name: string }[], name: string) {
  return items.find((item) => item.name.localeCompare(name, "tr") === 0)?.id;
}

export async function searchWorkshops(
  filters: WorkshopFilters,
  locale: Locale,
): Promise<WorkshopSearchResult> {
  void locale;
  const [provinces, specialties, vehicleTypes, vehicleBrands] = await Promise.all([
    serverCatalogService.getProvinces(),
    serverCatalogService.getSpecialtyCatalog(),
    serverCatalogService.getVehicleTypeCatalog(),
    serverCatalogService.getVehicleBrands(),
  ]);
  const provinceId = await catalogIdByName(provinces, filters.city);
  const [districts, specialty] = await Promise.all([
    provinceId ? serverCatalogService.getDistricts(provinceId) : Promise.resolve([]),
    specialties.find((item) => item.slug === filters.specialty || item.id === filters.specialty),
  ]);
  const districtId = await catalogIdByName(districts, filters.district);
  const vehicleType = vehicleTypes.find((item) => item.slug === filters.vehicleType || item.id === filters.vehicleType);
  const vehicleBrand = vehicleBrands.find((item) => item.id === filters.brand || item.slug === filters.brand);
  const result = await serverWorkshopService.list({
    search: filters.query || undefined,
    provinceId,
    districtId,
    brandId: vehicleBrand?.id,
    specialtyId: specialty?.id,
    vehicleTypeId: vehicleType?.id,
    sort: filters.sort === "yeni" ? "newest" : "rating_desc",
    page: filters.page,
    limit: 12,
  });
  const total = Number(result.meta.total ?? result.items.length);
  return {
    workshops: result.items,
    total,
    page: Number(result.meta.page ?? filters.page),
    totalPages: Number(result.meta.totalPages ?? Math.max(1, Math.ceil(total / 12))),
    filters,
  };
}

export const getWorkshopBySlug = cache(
  async (slug: string): Promise<Workshop | null> => {
    const limit = 100;
    const seenIds = new Set<string>();

    for (let page = 1; ; page += 1) {
      const result = await serverWorkshopService.list({ page, limit });
      const summary = result.items.find(
        (workshop) => workshop.slug === slug || workshop.id === slug,
      );

      if (summary) {
        if (summary.verificationStatus !== "verified") return null;
        const workshop = await serverWorkshopService.getById(summary.id);
        return workshop.verificationStatus === "verified" ? workshop : null;
      }

      const hasNewIds = result.items.some((workshop) => {
        if (seenIds.has(workshop.id)) return false;
        seenIds.add(workshop.id);
        return true;
      });
      if (!hasNewIds) return null;

      const totalPages = result.meta.totalPages;
      if (totalPages !== undefined) {
        if (page >= totalPages) return null;
      } else if (result.items.length < limit) {
        return null;
      }
    }
  },
);

export async function getFeaturedWorkshops(
  limit = 3,
): Promise<readonly Workshop[]> {
  const result = await serverWorkshopService.list({ sort: "rating_desc", limit });
  return result.items;
}

export async function getSpecialties(): Promise<readonly Specialty[]> {
  return serverCatalogService.getSpecialties();
}

export async function getSpecialtyCards(): Promise<
  readonly SpecialtySummary[]
> {
  const [items, result] = await Promise.all([
    serverCatalogService.getSpecialties(),
    serverWorkshopService.list({ limit: 100 }),
  ]);
  return items.map((item) => ({ ...item, workshopCount: result.items.filter((workshop) => workshop.specialties.includes(item.slug)).length }));
}

export async function getVehicleTypes(): Promise<readonly VehicleType[]> {
  return serverCatalogService.getVehicleTypes();
}

export async function getVehicleBrands(): Promise<readonly CatalogItem[]> {
  return serverCatalogService.getVehicleBrands();
}

export async function getCities(): Promise<readonly string[]> {
  const items = await serverCatalogService.getProvinces();
  return items.map(({ name }) => name).sort((a, b) => a.localeCompare(b, "tr"));
}

export async function getDistricts(
  city?: string,
): Promise<readonly string[]> {
  const provinces = await serverCatalogService.getProvinces();
  const provinceId = city ? await catalogIdByName(provinces, city) : undefined;
  if (!provinceId) return [];
  const items = await serverCatalogService.getDistricts(provinceId);
  return items.map(({ name }) => name).sort((a, b) => a.localeCompare(b, "tr"));
}

export const getSpecialtyBySlug = cache(
  async (slug: string): Promise<Specialty | null> => {
    const specialties = await getSpecialties();

    return specialties.find((specialty) => specialty.slug === slug) ?? null;
  },
);

export async function getWorkshopSlugs(): Promise<readonly string[]> {
  const result = await serverWorkshopService.list({ limit: 100 });
  return result.items
    .filter((workshop) => workshop.verificationStatus === "verified")
    .map(({ slug }) => slug);
}
