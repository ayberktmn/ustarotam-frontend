import { z } from "zod";

import type { ApiRequestFn, NextFetchOptions } from "@/lib/api/client";
import {
  apiSuccessSchema,
  apiWorkshopSchema,
  apiWorkshopReviewSchema,
} from "@/lib/api/schemas";
import type { PagedResult } from "@/types/api";
import type { Workshop, WorkshopReview } from "@/types/workshop";

export interface WorkshopGetOptions {
  signal?: AbortSignal;
}

export interface WorkshopListQuery {
  search?: string;
  provinceId?: string;
  districtId?: string;
  industrialSiteId?: string;
  vehicleTypeId?: string;
  brandId?: string;
  specialtyId?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CreateWorkshopInput {
  name: string;
  provinceId: string;
  districtId: string;
  address: string;
  phone: string;
  description?: string;
  industrialSiteId?: string;
  vehicleTypeIds?: string[];
  brandIds?: string[];
  specialtyIds?: string[];
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
}

export type UpdateWorkshopInput = Partial<CreateWorkshopInput>;

const workshopListSchema = apiSuccessSchema(
  z.array(apiWorkshopSchema),
);
const workshopReviewsSchema = apiSuccessSchema(z.array(apiWorkshopReviewSchema));

export interface WorkshopServiceOptions {
  next?: NextFetchOptions;
}

export function createWorkshopService(
  request: ApiRequestFn,
  options: WorkshopServiceOptions = {},
) {
  return {
    async list(
      query: WorkshopListQuery = {},
    ): Promise<PagedResult<Workshop>> {
      const payload = await request({
        path: "/workshops",
        query: {
          search: query.search,
          provinceId: query.provinceId,
          districtId: query.districtId,
          industrialSiteId: query.industrialSiteId,
          vehicleTypeId: query.vehicleTypeId,
          brandId: query.brandId,
          specialtyId: query.specialtyId,
          sort: query.sort,
          page: query.page,
          limit: query.limit,
        },
        schema: workshopListSchema,
        responseMode: "raw",
        auth: "none",
        next: options.next,
      });

      return {
        items: payload.data,
        meta: payload.meta ?? {},
      };
    },

    async listMine(page = 1, limit = 20): Promise<PagedResult<Workshop>> {
      const payload = await request({
        path: "/workshops/mine",
        query: {page, limit},
        schema: workshopListSchema,
        responseMode: "raw",
        auth: "required",
      });
      return {items: payload.data, meta: payload.meta ?? {}};
    },

    getById(id: string, requestOptions: WorkshopGetOptions = {}): Promise<Workshop> {
      return request({
        path: `/workshops/${encodeURIComponent(id)}`,
        schema: apiWorkshopSchema,
        auth: "none",
        signal: requestOptions.signal,
        next: options.next,
      });
    },

    async getReviews(id: string, page = 1, limit = 20): Promise<PagedResult<WorkshopReview>> {
      const payload = await request({
        path: `/workshops/${encodeURIComponent(id)}/reviews`,
        query: { page, limit },
        schema: workshopReviewsSchema,
        responseMode: "raw",
        auth: "none",
        next: options.next,
      });
      return {
        items: payload.data.filter(
          (review) =>
            review.moderationStatus === undefined ||
            review.moderationStatus === "PUBLISHED",
        ),
        meta: payload.meta ?? {},
      };
    },

    create(input: CreateWorkshopInput): Promise<Workshop> {
      return request({
        path: "/workshops",
        method: "POST",
        body: input,
        schema: apiWorkshopSchema,
        auth: "required",
        retries: 0,
      });
    },

    update(
      id: string,
      input: UpdateWorkshopInput,
    ): Promise<Workshop> {
      return request({
        path: `/workshops/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: input,
        schema: apiWorkshopSchema,
        auth: "required",
        retries: 0,
      });
    },
  };
}

export type WorkshopService = ReturnType<typeof createWorkshopService>;
