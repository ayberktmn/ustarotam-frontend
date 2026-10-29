import { describe, expect, it, vi } from "vitest";

import type { ApiRequestFn } from "@/lib/api/client";
import { apiWorkshopSchema } from "@/lib/api/schemas";
import { createWorkshopService } from "@/lib/api/endpoints/workshops";

const workshop = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "ornek-servis",
  name: "Örnek Servis",
  province: { id: "p1", name: "İstanbul" },
  district: { id: "d1", name: "Kadıköy" },
  specialties: [{ id: "s1", name: "Motor", slug: "motor" }],
  vehicleTypes: [{ id: "v1", name: "Otomobil", slug: "otomobil" }],
  averageRating: 5,
  reviewCount: 1,
};

describe("public workshop HTTP contracts", () => {
  it.each([
    ["PENDING", undefined],
    ["REJECTED", undefined],
    ["SUSPENDED", undefined],
    ["VERIFIED", "SUSPENDED"],
  ])("does not mark non-public workshop status %s/%s as verified", (
    verificationStatus,
    status,
  ) => {
    const mapped = apiWorkshopSchema.parse({
      ...workshop,
      verificationStatus,
      status,
    });

    expect(mapped.verificationStatus).toBe("pending");
  });

  it("passes filters and pagination to the workshop list", async () => {
    const request = vi.fn(async (options) => options.schema.parse({
      success: true,
      data: [workshop],
      meta: { page: 2, limit: 12, total: 13, totalPages: 2 },
    })) as ApiRequestFn;
    const service = createWorkshopService(request);

    const result = await service.list({
      search: "Ankara",
      provinceId: "p1",
      districtId: "d1",
      brandId: "b1",
      specialtyId: "s1",
      vehicleTypeId: "v1",
      sort: "rating_desc",
      page: 2,
      limit: 12,
    });

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: "/workshops",
      query: {
        search: "Ankara",
        provinceId: "p1",
        districtId: "d1",
        industrialSiteId: undefined,
        vehicleTypeId: "v1",
        brandId: "b1",
        specialtyId: "s1",
        sort: "rating_desc",
        page: 2,
        limit: 12,
      },
    }));
    expect(result.meta.totalPages).toBe(2);
    expect(result.items[0].specialties).toEqual(["motor"]);
  });

  it("loads a public workshop detail by UUID", async () => {
    const request = vi.fn(async (options) => options.schema.parse(workshop)) as ApiRequestFn;
    const signal = new AbortController().signal;

    await createWorkshopService(request).getById(workshop.id, { signal });

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: `/workshops/${workshop.id}`,
      auth: "none",
      signal,
    }));
  });

  it("maps public workshop reviews", async () => {
    const request = vi.fn(async (options) => options.schema.parse({
      success: true,
      data: [{ id: "r1", overallRating: 5, comment: "Harika", createdAt: "2026-10-01T10:00:00.000Z", author: { displayName: "Ayşe Y." } }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })) as ApiRequestFn;
    const reviews = await createWorkshopService(request).getReviews(workshop.id);

    expect(request).toHaveBeenCalledWith(expect.objectContaining({ path: `/workshops/${workshop.id}/reviews`, query: { page: 1, limit: 20 } }));
    expect(reviews.items[0]).toMatchObject({ authorName: "Ayşe Y.", rating: 5, comment: { tr: "Harika", en: "Harika" } });
  });

  it("does not expose moderated or removed reviews in the public list", async () => {
    const request = vi.fn(async (options) => options.schema.parse({
      success: true,
      data: [
        { id: "published", overallRating: 5, comment: "Yayında", createdAt: "2026-10-01T10:00:00.000Z", moderationStatus: "PUBLISHED", author: { displayName: "Ayşe Y." } },
        { id: "pending", overallRating: 4, comment: "İncelemede", createdAt: "2026-10-01T10:00:00.000Z", moderationStatus: "PENDING", author: { displayName: "Mehmet K." } },
      ],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    })) as ApiRequestFn;

    const reviews = await createWorkshopService(request).getReviews(workshop.id);

    expect(reviews.items.map(({ id }) => id)).toEqual(["published"]);
  });

  it("reads the owner workshop list as a paginated protected endpoint", async () => {
    const request = vi.fn(async (options) => options.schema.parse({success: true, data: [workshop], meta: {page: 2, limit: 5, total: 6, totalPages: 2}})) as ApiRequestFn;
    const result = await createWorkshopService(request).listMine(2, 5);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({path: "/workshops/mine", query: {page: 2, limit: 5}, auth: "required", responseMode: "raw"}));
    expect(result.meta.totalPages).toBe(2);
  });
});
