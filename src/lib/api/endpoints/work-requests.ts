import { z } from "zod";

import type { ApiRequestFn } from "@/lib/api/client";
import { apiSuccessSchema, idSchema, paginationMetaSchema } from "@/lib/api/schemas";
import type { PagedResult } from "@/types/api";
import type { CreateReviewInput } from "@/types/review";
import type { WorkOffer, CreateWorkOfferInput } from "@/types/work-offer";
import {
  workRequestStatuses,
  type CreateWorkRequestInput,
  type UpdateWorkRequestInput,
  type WorkRequest,
  type WorkRequestProvince,
  type WorkRequestSpecialty,
  type WorkRequestStatus,
} from "@/types/work-request";
import { ownedReviewSchema } from "@/lib/api/endpoints/reviews";

const statusSchema = z.enum(workRequestStatuses);
const catalogItemBaseSchema = z.object({
  id: idSchema,
  name: z.string(),
  // `slug` is selected by the API, but older catalog rows can have a null
  // value. It is not used to identify or render a work request, so retain a
  // stable client value instead of rejecting an otherwise valid response.
  slug: z.string().nullish(),
}).strict();
const catalogItemSchema = catalogItemBaseSchema.transform((item) => ({
  ...item,
  slug: item.slug ?? item.id,
}));
const provinceSchema: z.ZodType<WorkRequestProvince> = catalogItemBaseSchema.extend({
  // Province codes are numeric in the work-request API response, while
  // catalog endpoints may serialize them as strings.
  code: z.union([z.string(), z.number()]).transform((code) => String(code)),
}).transform((item) => ({
  ...item,
  slug: item.slug ?? item.id,
}));
const specialtySchema: z.ZodType<WorkRequestSpecialty> = catalogItemBaseSchema.extend({
  description: z.string().nullable(),
}).transform((item) => ({
  ...item,
  slug: item.slug ?? item.id,
}));
const workRequestSchema: z.ZodType<WorkRequest> = z.object({
  id: idSchema,
  vehicleType: catalogItemSchema,
  vehicleBrand: catalogItemSchema.nullable(),
  vehicleModel: catalogItemSchema.nullable(),
  specialty: specialtySchema,
  province: provinceSchema,
  district: catalogItemSchema,
  address: z.string(),
  description: z.string(),
  status: statusSchema,
  assignedWorkshopId: idSchema.nullable(),
  photoCount: z.number().int().nonnegative(),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string(),
}).strict();

const workRequestEnvelope = apiSuccessSchema(workRequestSchema);
const workRequestListEnvelope = z.object({
  success: z.literal(true),
  data: z.array(workRequestSchema),
  meta: paginationMetaSchema,
}).strict();
const workOfferRequestSchema = z.object({
  id: idSchema,
  status: statusSchema,
  vehicleType: catalogItemSchema,
  vehicleBrand: catalogItemSchema.nullable(),
  vehicleModel: catalogItemSchema.nullable(),
  specialty: specialtySchema,
  province: catalogItemSchema,
  district: catalogItemSchema,
  address: z.string(),
}).passthrough();
const workOfferSchema: z.ZodType<WorkOffer> = z.object({
  id: idSchema,
  requestId: idSchema,
  amount: z.coerce.number().finite().positive(),
  currency: z.enum(["TRY", "EUR", "USD"]),
  description: z.string(),
  expiresAt: z.coerce.string(),
  status: z.enum(["SUBMITTED", "WITHDRAWN", "REJECTED", "ACCEPTED", "EXPIRED"]),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string(),
  request: workOfferRequestSchema,
}).passthrough();
const workOfferListEnvelope = z.object({
  success: z.literal(true),
  data: z.array(workOfferSchema),
  meta: paginationMetaSchema,
}).strict();

export interface WorkRequestListQuery {
  status?: WorkRequestStatus;
  page?: number;
  limit?: number;
}

export function createWorkRequestService(request: ApiRequestFn) {
  return {
    async listMine(query: WorkRequestListQuery = {}): Promise<PagedResult<WorkRequest>> {
      const payload = await request({
        path: "/work-requests/mine",
        query: { status: query.status, page: query.page ?? 1, limit: query.limit ?? 20 },
        schema: workRequestListEnvelope,
        responseMode: "raw",
        auth: "required",
        retries: 0,
      });
      return { items: payload.data, meta: payload.meta };
    },

    getById(id: string, signal?: AbortSignal): Promise<WorkRequest> {
      return request({
        path: `/work-requests/${encodeURIComponent(id)}`,
        schema: workRequestEnvelope,
        responseMode: "raw",
        auth: "required",
        signal,
        retries: 0,
      }).then((payload) => payload.data);
    },

    create(input: CreateWorkRequestInput): Promise<WorkRequest> {
      return request({
        path: "/work-requests",
        method: "POST",
        body: input,
        schema: workRequestEnvelope,
        responseMode: "raw",
        auth: "required",
        retries: 0,
      }).then((payload) => payload.data);
    },

    update(id: string, input: UpdateWorkRequestInput): Promise<WorkRequest> {
      return request({
        path: `/work-requests/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: input,
        schema: workRequestEnvelope,
        responseMode: "raw",
        auth: "required",
        retries: 0,
      }).then((payload) => payload.data);
    },

    cancel(id: string): Promise<WorkRequest> {
      return request({
        path: `/work-requests/${encodeURIComponent(id)}/cancel`,
        method: "POST",
        schema: workRequestEnvelope,
        responseMode: "raw",
        auth: "required",
        retries: 0,
      }).then((payload) => payload.data);
    },

    start(id: string): Promise<WorkRequest> {
      return request({
        path: `/work-requests/${encodeURIComponent(id)}/start`,
        method: "POST",
        schema: workRequestEnvelope,
        responseMode: "raw",
        auth: "required",
        retries: 0,
      }).then((payload) => payload.data);
    },

    complete(id: string): Promise<WorkRequest> {
      return request({
        path: `/work-requests/${encodeURIComponent(id)}/complete`,
        method: "POST",
        schema: workRequestEnvelope,
        responseMode: "raw",
        auth: "required",
        retries: 0,
      }).then((payload) => payload.data);
    },

    listOffers(
      id: string,
      query: { page?: number; limit?: number } = {},
    ): Promise<PagedResult<WorkOffer>> {
      return request({
        path: `/work-requests/${encodeURIComponent(id)}/offers`,
        query: { page: query.page ?? 1, limit: query.limit ?? 20 },
        schema: workOfferListEnvelope,
        responseMode: "raw",
        auth: "required",
        retries: 0,
      }).then((payload) => ({ items: payload.data, meta: payload.meta }));
    },

    acceptOffer(id: string): Promise<void> {
      return request({
        path: `/work-offers/${encodeURIComponent(id)}/accept`,
        method: "POST",
        schema: z.void(),
        auth: "required",
        retries: 0,
      });
    },

    rejectOffer(id: string): Promise<void> {
      return request({
        path: `/work-offers/${encodeURIComponent(id)}/reject`,
        method: "POST",
        schema: z.void(),
        auth: "required",
        retries: 0,
      });
    },

    createOffer(
      requestId: string,
      input: CreateWorkOfferInput,
    ): Promise<WorkOffer> {
      return request({
        path: `/work-requests/${encodeURIComponent(requestId)}/offers`,
        method: "POST",
        body: input,
        schema: apiSuccessSchema(workOfferSchema),
        responseMode: "raw",
        auth: "required",
        retries: 0,
      }).then((payload) => payload.data);
    },

    createReview(id: string, input: CreateReviewInput) {
      return request({
        path: `/work-requests/${encodeURIComponent(id)}/review`,
        method: "POST",
        body: input,
        schema: apiSuccessSchema(ownedReviewSchema),
        responseMode: "raw",
        auth: "required",
        retries: 0,
      }).then((payload) => payload.data);
    },
  };
}

export type WorkRequestService = ReturnType<typeof createWorkRequestService>;
