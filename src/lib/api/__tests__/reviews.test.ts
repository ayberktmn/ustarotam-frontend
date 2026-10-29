import { describe, expect, it, vi } from "vitest";

import type { ApiRequestFn } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { createReviewService, getReviewCooldownRemainingSeconds } from "@/lib/api/endpoints/reviews";

const review = {
  id: "10000000-0000-4000-8000-000000000001",
  workshopId: "20000000-0000-4000-8000-000000000002",
  overallRating: 5,
  serviceDescription: "Periyodik bakım",
  serviceDate: "2026-10-20T00:00:00.000Z",
  resolutionStatus: "YES",
  comment: "Çok memnun kaldım",
  verificationStatus: "UNVERIFIED",
  moderationStatus: "PENDING",
  withdrawnAt: null,
  createdAt: "2026-10-29T10:00:00.000Z",
  author: { firstName: "Ayşe", lastName: "Yılmaz" },
  specialtyRatings: [{
    rating: 5,
    specialty: {
      id: "30000000-0000-4000-8000-000000000003",
      name: "Periyodik bakım",
      slug: "periyodik-bakim",
    },
  }],
  ownerReply: null,
};

describe("review HTTP contracts", () => {
  it("sends only the backend create-review fields", async () => {
    const requestMock = vi.fn(async (options: Parameters<ApiRequestFn>[0]) =>
      options.schema.parse(review));
    const request = requestMock as ApiRequestFn;
    const service = createReviewService(request);
    const input = {
      overallRating: 5 as const,
      serviceDescription: "Periyodik bakım",
      serviceDate: "2026-10-20",
      resolutionStatus: "YES" as const,
      comment: "Çok memnun kaldım",
      specialtyRatings: [{ specialtyId: "30000000-0000-4000-8000-000000000003", rating: 5 as const }],
    };

    const created = await service.create(review.workshopId, input);

    expect(request).toHaveBeenCalledWith({
      path: `/workshops/${review.workshopId}/reviews`,
      method: "POST",
      body: input,
      schema: expect.anything(),
      auth: "required",
      retries: 0,
    });
    expect(requestMock.mock.calls[0]?.[0].body).not.toHaveProperty("verificationStatus");
    expect(created.moderationStatus).toBe("PENDING");
  });

  it("maps authenticated history and moderation state", async () => {
    const request = vi.fn(async (options) => options.schema.parse({
      success: true,
      data: [review],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })) as ApiRequestFn;

    const result = await createReviewService(request).listMine();

    expect(result.items[0]).toMatchObject({
      rating: 5,
      moderationStatus: "PENDING",
      verificationStatus: "UNVERIFIED",
      authorName: "Ayşe Y.",
    });
  });

  it("loads all review-history pages using pagination metadata", async () => {
    const request = vi.fn(async (options) => options.schema.parse({
      success: true,
      data: [review],
      meta: {
        page: options.query?.page,
        limit: options.query?.limit,
        total: 101,
        totalPages: 2,
      },
    })) as ApiRequestFn;

    const items = await createReviewService(request).listAllMine(100);

    expect(items).toHaveLength(2);
    expect(request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      path: "/reviews/mine",
      query: { page: 1, limit: 100 },
      auth: "required",
    }));
    expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      path: "/reviews/mine",
      query: { page: 2, limit: 100 },
      auth: "required",
    }));
  });

  it("preserves a published status returned by review creation", async () => {
    const request = vi.fn(async (options) =>
      options.schema.parse({ ...review, moderationStatus: "PUBLISHED" }),
    ) as ApiRequestFn;

    const result = await createReviewService(request).create(review.workshopId, {
      overallRating: 5,
      serviceDescription: "Periyodik bakım",
      serviceDate: "2026-10-20",
      resolutionStatus: "YES",
      comment: "Çok memnun kaldım",
      specialtyRatings: [{
        specialtyId: "30000000-0000-4000-8000-000000000003",
        rating: 5,
      }],
    });

    expect(result.moderationStatus).toBe("PUBLISHED");
  });

  it("uses PATCH for review updates", async () => {
    const request = vi.fn(async (options) => options.schema.parse(review)) as ApiRequestFn;
    const input = { overallRating: 4 as const, comment: "Güncellenmiş yorum" };

    await createReviewService(request).update(review.id, input);

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: `/reviews/${review.id}`,
      method: "PATCH",
      body: input,
      auth: "required",
      retries: 0,
    }));
  });

  it("uses DELETE for review withdrawal", async () => {
    const request = vi.fn(async (options) => options.schema.parse(undefined)) as ApiRequestFn;

    await createReviewService(request).remove(review.id);

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: `/reviews/${review.id}`,
      method: "DELETE",
      auth: "required",
      retries: 0,
    }));
  });

  it("reads cooldown seconds or retry time", () => {
    const fromSeconds = new ApiError({
      kind: "rate_limit",
      code: "REVIEW_COOLDOWN_ACTIVE",
      message: "cooldown",
      details: { retryAfterSeconds: 90 },
    });
    const fromDate = new ApiError({
      kind: "rate_limit",
      code: "REVIEW_COOLDOWN_ACTIVE",
      message: "cooldown",
      details: { retryAt: "2026-10-29T10:02:00.000Z" },
    });

    expect(getReviewCooldownRemainingSeconds(fromSeconds)).toBe(90);
    expect(getReviewCooldownRemainingSeconds(
      fromDate,
      Date.parse("2026-10-29T10:00:00.000Z"),
    )).toBe(120);
  });

  it("uses PUT for an owner reply", async () => {
    const request = vi.fn(async (options) => options.schema.parse({
      reviewId: review.id,
      reply: "Teşekkürler",
      createdAt: "2026-10-29T10:00:00.000Z",
      updatedAt: "2026-10-29T10:00:00.000Z",
    })) as ApiRequestFn;

    await createReviewService(request).reply(review.id, "Teşekkürler");

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: `/reviews/${review.id}/reply`,
      method: "PUT",
      body: { reply: "Teşekkürler" },
      auth: "required",
      retries: 0,
    }));
  });

  it("reports a review with the required authenticated request", async () => {
    const request = vi.fn(async (options) => options.schema.parse(undefined)) as ApiRequestFn;

    await createReviewService(request).report(review.id, "Yanıltıcı bilgi");

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: `/reviews/${review.id}/reports`,
      method: "POST",
      body: { reason: "Yanıltıcı bilgi" },
      auth: "required",
      retries: 0,
    }));
  });
});
