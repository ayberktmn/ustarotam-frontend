import { z } from "zod";

import type { ApiRequestFn } from "@/lib/api/client";
import { apiSuccessSchema, idSchema } from "@/lib/api/schemas";
import { isApiError } from "@/lib/api/errors";
import type { PagedResult } from "@/types/api";
import type {
  CreateReviewInput,
  OwnedReview,
  UpdateReviewInput,
} from "@/types/review";
import type { ReviewOwnerReply } from "@/types/workshop";

const ratingSchema = z.number().int().min(1).max(5);
const verificationStatusSchema = z.enum([
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
]);
const moderationStatusSchema = z.enum([
  "PENDING",
  "PUBLISHED",
  "REJECTED",
  "REMOVED",
]);

const ownerReplySchema = z.object({
  reply: z.string(),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string(),
});

const ownedReviewSchema: z.ZodType<OwnedReview> = z
  .object({
    id: idSchema,
    workshopId: idSchema,
    overallRating: ratingSchema,
    comment: z.string(),
    createdAt: z.coerce.string(),
    serviceDescription: z.string(),
    serviceDate: z.coerce.string(),
    resolutionStatus: z.enum(["YES", "NO", "PARTIAL"]),
    verificationStatus: verificationStatusSchema,
    moderationStatus: moderationStatusSchema,
    withdrawnAt: z.coerce.string().nullable().optional(),
    ownerReply: ownerReplySchema.nullable().optional(),
    author: z.union([
      z.object({ displayName: z.string() }),
      z.object({ firstName: z.string(), lastName: z.string() }),
    ]).optional(),
    specialtyRatings: z.array(z.object({
      rating: ratingSchema,
      specialty: z.object({
        id: idSchema,
        name: z.string(),
        slug: z.string().optional(),
      }),
    })).default([]),
  })
  .passthrough()
  .transform((value) => ({
    id: value.id,
    workshopId: value.workshopId,
    authorName: value.author
      ? "displayName" in value.author
        ? value.author.displayName
        : `${value.author.firstName} ${value.author.lastName.charAt(0)}.`
      : "",
    rating: value.overallRating as 1 | 2 | 3 | 4 | 5,
    comment: { tr: value.comment, en: value.comment },
    createdAt: value.createdAt,
    serviceDescription: value.serviceDescription,
    serviceDate: value.serviceDate,
    resolutionStatus: value.resolutionStatus,
    verificationStatus: value.verificationStatus,
    moderationStatus: value.moderationStatus,
    withdrawnAt: value.withdrawnAt ?? null,
    ownerReply: value.ownerReply ?? null,
    specialtyRatings: value.specialtyRatings.map((item) => ({
      rating: item.rating as 1 | 2 | 3 | 4 | 5,
      specialty: item.specialty,
    })),
  }));

const reviewsSchema = apiSuccessSchema(z.array(ownedReviewSchema));
const replySchema = z.object({
  reviewId: idSchema,
  reply: z.string(),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string(),
});

export function createReviewService(request: ApiRequestFn) {
  return {
    async listMine(page = 1, limit = 20): Promise<PagedResult<OwnedReview>> {
      const payload = await request({
        path: "/reviews/mine",
        query: { page, limit },
        schema: reviewsSchema,
        responseMode: "raw",
        auth: "required",
      });

      return { items: payload.data, meta: payload.meta ?? {} };
    },

    async listAllMine(limit = 100): Promise<OwnedReview[]> {
      const firstPage = await this.listMine(1, limit);
      const totalPages = firstPage.meta.totalPages
        ?? (firstPage.meta.total === undefined
          ? 1
          : Math.max(1, Math.ceil(firstPage.meta.total / (firstPage.meta.limit ?? limit))));
      const reviews = [...firstPage.items];

      for (let page = 2; page <= totalPages; page += 1) {
        const result = await this.listMine(page, limit);
        reviews.push(...result.items);
      }

      return reviews;
    },

    create(workshopId: string, input: CreateReviewInput): Promise<OwnedReview> {
      return request({
        path: `/workshops/${encodeURIComponent(workshopId)}/reviews`,
        method: "POST",
        body: input,
        schema: ownedReviewSchema,
        auth: "required",
        retries: 0,
      });
    },

    update(reviewId: string, input: UpdateReviewInput): Promise<OwnedReview> {
      return request({
        path: `/reviews/${encodeURIComponent(reviewId)}`,
        method: "PATCH",
        body: input,
        schema: ownedReviewSchema,
        auth: "required",
        retries: 0,
      });
    },

    remove(reviewId: string): Promise<void> {
      return request({
        path: `/reviews/${encodeURIComponent(reviewId)}`,
        method: "DELETE",
        schema: z.void(),
        auth: "required",
        retries: 0,
      });
    },

    reply(reviewId: string, reply: string): Promise<ReviewOwnerReply> {
      return request({
        path: `/reviews/${encodeURIComponent(reviewId)}/reply`,
        method: "PUT",
        body: { reply },
        schema: replySchema,
        auth: "required",
        retries: 0,
      }).then((value) => ({
        reply: value.reply,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
      }));
    },

    report(reviewId: string, reason: string): Promise<unknown> {
      return request({
        path: `/reviews/${encodeURIComponent(reviewId)}/reports`,
        method: "POST",
        body: { reason },
        schema: z.unknown(),
        auth: "required",
        retries: 0,
      });
    },
  };
}

export function getReviewCooldownRemainingSeconds(
  error: unknown,
  now = Date.now(),
): number | null {
  if (!isApiError(error) || error.code !== "REVIEW_COOLDOWN_ACTIVE") {
    return null;
  }

  const details = z.object({
    retryAfterSeconds: z.coerce.number().nonnegative().optional(),
    retryAt: z.coerce.string().optional(),
  }).passthrough().safeParse(error.details);

  if (details.success && details.data.retryAfterSeconds !== undefined) {
    return Math.ceil(details.data.retryAfterSeconds);
  }

  if (details.success && details.data.retryAt) {
    const retryAt = Date.parse(details.data.retryAt);
    if (!Number.isNaN(retryAt)) {
      return Math.max(0, Math.ceil((retryAt - now) / 1000));
    }
  }

  return error.retryAfterMs === undefined
    ? null
    : Math.max(0, Math.ceil(error.retryAfterMs / 1000));
}

export type ReviewService = ReturnType<typeof createReviewService>;
