import { z } from "zod";

import type { ApiRequestFn, NextFetchOptions } from "@/lib/api/client";
import {
  apiCatalogItemSchema,
  apiSpecialtySchema,
  apiSuccessSchema,
  apiVehicleTypeSchema,
} from "@/lib/api/schemas";

export interface CatalogItem {
  id: string;
  name: string;
  code?: string;
  slug?: string;
}

const catalogListSchema = apiSuccessSchema(
  z.array(apiCatalogItemSchema),
);
const specialtyListSchema = apiSuccessSchema(
  z.array(apiSpecialtySchema),
);
const vehicleTypeListSchema = apiSuccessSchema(
  z.array(apiVehicleTypeSchema),
);

function unwrapList<T>(
  payload: { success: true; data: T[] },
): T[] {
  return payload.data;
}

export interface CatalogServiceOptions {
  next?: NextFetchOptions;
}

interface CatalogRequestOptions {
  signal?: AbortSignal;
  retries?: number;
}

export function createCatalogService(
  request: ApiRequestFn,
  options: CatalogServiceOptions = {},
) {
  function list(path: string, query?: Record<string, string>, requestOptions: CatalogRequestOptions = {}) {
    return request({
      path,
      query,
      schema: catalogListSchema,
      responseMode: "raw",
      auth: "none",
      signal: requestOptions.signal,
      retries: requestOptions.retries,
      next: options.next,
    }).then((payload) => unwrapList(payload));
  }

  return {
    getSpecialtyCatalog(): Promise<CatalogItem[]> {
      return list("/specialties");
    },

    getVehicleTypeCatalog(): Promise<CatalogItem[]> {
      return list("/vehicles/types");
    },

    getProvinces(): Promise<CatalogItem[]> {
      return list("/locations/provinces");
    },

    getDistricts(provinceId: string, requestOptions: CatalogRequestOptions = {}): Promise<CatalogItem[]> {
      return list(
        `/locations/provinces/${encodeURIComponent(provinceId)}/districts`,
        undefined,
        {...requestOptions, retries: 0},
      );
    },

    getIndustrialSites(districtId: string, requestOptions: CatalogRequestOptions = {}): Promise<CatalogItem[]> {
      return list(
        `/locations/districts/${encodeURIComponent(districtId)}/industrial-sites`,
        undefined,
        {...requestOptions, retries: 0},
      );
    },

    getVehicleTypes() {
      return request({
        path: "/vehicles/types",
        schema: vehicleTypeListSchema,
        responseMode: "raw",
        auth: "none",
        next: options.next,
      }).then((payload) => payload.data);
    },

    getVehicleBrands(): Promise<CatalogItem[]> {
      return list("/vehicles/brands");
    },

    getVehicleModels(query: {
      brandId?: string;
      typeId?: string;
    } = {}): Promise<CatalogItem[]> {
      return list("/vehicles/models", query);
    },

    getSpecialties() {
      return request({
        path: "/specialties",
        schema: specialtyListSchema,
        responseMode: "raw",
        auth: "none",
        next: options.next,
      }).then((payload) => payload.data);
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
