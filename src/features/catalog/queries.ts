"use client";

import { useQuery } from "@tanstack/react-query";

import { catalogService } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

const CATALOG_STALE_TIME = 60 * 60_000;
const CATALOG_GC_TIME = 24 * 60 * 60_000;

export function useProvinces() {
  return useQuery({
    queryKey: queryKeys.catalog.provinces,
    queryFn: () => catalogService.getProvinces(),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useDistricts(provinceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.catalog.districts(provinceId ?? "none"),
    queryFn: ({signal}) => catalogService.getDistricts(provinceId ?? "", {signal}),
    enabled: Boolean(provinceId),
    retry: false,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useIndustrialSites(districtId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.catalog.industrialSites(districtId ?? "none"),
    queryFn: ({signal}) => catalogService.getIndustrialSites(districtId ?? "", {signal}),
    enabled: Boolean(districtId),
    retry: false,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useVehicleTypes() {
  return useQuery({
    queryKey: queryKeys.catalog.vehicleTypes,
    queryFn: () => catalogService.getVehicleTypes(),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useVehicleTypeCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog.vehicleTypeCatalog,
    queryFn: () => catalogService.getVehicleTypeCatalog(),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useVehicleBrands() {
  return useQuery({
    queryKey: queryKeys.catalog.vehicleBrands,
    queryFn: () => catalogService.getVehicleBrands(),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useVehicleModels(brandId?: string, typeId?: string) {
  return useQuery({
    queryKey: queryKeys.catalog.vehicleModels(brandId, typeId),
    queryFn: () => catalogService.getVehicleModels({ brandId, typeId }),
    enabled: Boolean(brandId || typeId),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useSpecialties() {
  return useQuery({
    queryKey: queryKeys.catalog.specialties,
    queryFn: () => catalogService.getSpecialties(),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useSpecialtyCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog.specialtyCatalog,
    queryFn: () => catalogService.getSpecialtyCatalog(),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}
