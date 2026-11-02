import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiRequestFn } from "@/lib/api/client";
import { browserRequest } from "@/lib/api/client";
import { createWorkRequestService } from "@/lib/api/endpoints/work-requests";
import { clearAccessToken, setAccessToken } from "@/lib/api/token-store";

const requestId = "10000000-0000-4000-8000-000000000001";
const ids = {
  vehicleType: "10000000-0000-4000-8000-000000000002",
  specialty: "10000000-0000-4000-8000-000000000003",
  province: "10000000-0000-4000-8000-000000000004",
  district: "10000000-0000-4000-8000-000000000005",
};
const item = (id: string, name: string) => ({ id, name, slug: name.toLowerCase() });
const row = {
  id: requestId,
  vehicleType: item(ids.vehicleType, "Car"),
  vehicleBrand: null,
  vehicleModel: null,
  specialty: { ...item(ids.specialty, "Engine"), description: null },
  province: { ...item(ids.province, "Ankara"), code: "06" },
  district: item(ids.district, "Cankaya"),
  address: "123 Main Street",
  description: "Engine fault needs diagnosis",
  status: "PUBLISHED",
  assignedWorkshopId: null,
  photoCount: 0,
  createdAt: "2026-10-29T12:00:00.000Z",
  updatedAt: "2026-10-29T12:00:00.000Z",
};
const input = {
  vehicleTypeId: ids.vehicleType,
  vehicleBrandId: null,
  vehicleModelId: null,
  specialtyId: ids.specialty,
  provinceId: ids.province,
  districtId: ids.district,
  address: row.address,
  description: row.description,
};
const offerId = "10000000-0000-4000-8000-000000000010";
const offer = {
  id: offerId,
  requestId,
  amount: 2500,
  currency: "TRY",
  description: "Parts and labor included",
  expiresAt: "2026-11-08T09:00:00.000Z",
  status: "SUBMITTED",
  createdAt: "2026-10-29T12:00:00.000Z",
  updatedAt: "2026-10-29T12:00:00.000Z",
  request: {
    id: requestId,
    status: "PUBLISHED",
    vehicleType: item(ids.vehicleType, "Car"),
    vehicleBrand: null,
    vehicleModel: null,
    specialty: item(ids.specialty, "Engine"),
    province: item(ids.province, "Ankara"),
    district: item(ids.district, "Cankaya"),
    address: "123 Main Street",
  },
};

afterEach(() => {
  clearAccessToken();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("customer work request API contracts", () => {
  it("uses the authenticated customer list endpoint and validates pagination", async () => {
    const request = vi.fn(async (options) => options.schema.parse({
      success: true,
      data: [row],
      meta: { page: 2, limit: 10, total: 11, totalPages: 2 },
    })) as ApiRequestFn;
    const result = await createWorkRequestService(request).listMine({ status: "PUBLISHED", page: 2, limit: 10 });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: "/work-requests/mine",
      query: { status: "PUBLISHED", page: 2, limit: 10 },
      auth: "required",
      retries: 0,
    }));
    expect(result.items).toEqual([row]);
  });

  it("accepts the real 200 mine envelope with numeric province codes and nullable vehicle relations", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api/v1");
    setAccessToken("test.token");
    const responseRows = [
      {
        id: "36597d2a-1392-4c87-87b3-42bc026f4b5e",
        vehicleType: { id: "a742510c-5d24-4e96-932b-d59a326611b3", name: "Otomobil", slug: "otomobil" },
        vehicleBrand: { id: "31e5bf17-ca89-4b59-aebe-00be58130361", name: "BMW", slug: "bmw" },
        vehicleModel: null,
        specialty: { id: "6ea19a96-ad15-442e-ad06-53e9940dcc4b", name: "Fren", slug: "fren", description: null },
        province: { id: "d8140ec4-f870-41b9-b172-d051cea88c08", code: 45, name: "Manisa", slug: "manisa" },
        district: { id: "25a955b5-30e1-4cfb-b7ca-3315427b00e4", name: "Şehzadeler", slug: "sehzadeler" },
        address: "merkez",
        description: "fren tutmuyor",
        status: "PUBLISHED",
        assignedWorkshopId: null,
        createdAt: "2026-10-29T18:19:49.978Z",
        updatedAt: "2026-10-29T18:19:49.962Z",
      },
      { ...row, id: "10000000-0000-4000-8000-000000000011" },
      { ...row, id: "10000000-0000-4000-8000-000000000012" },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      success: true,
      data: responseRows,
      meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
    }, { status: 200 })));

    const result = await createWorkRequestService(browserRequest).listMine();
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({
      id: responseRows[0].id,
      vehicleBrand: responseRows[0].vehicleBrand,
      vehicleModel: null,
      province: { code: "45" },
      photoCount: 0,
    });
  });

  it("sends only validator-approved create and update fields", async () => {
    const requestMock = vi.fn(async (options) => options.schema.parse({ success: true, data: row }));
    const request = requestMock as ApiRequestFn;
    const service = createWorkRequestService(request);
    await service.create(input);
    await service.update(requestId, { description: "Updated diagnosis details" });
    expect(request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      path: "/work-requests", method: "POST", body: input, retries: 0,
    }));
    expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      path: `/work-requests/${requestId}`, method: "PATCH",
      body: { description: "Updated diagnosis details" }, retries: 0,
    }));
    expect(requestMock.mock.calls[0][0].body).not.toHaveProperty("status");
  });

  it("unwraps a real 201 success envelope exactly once", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api/v1");
    setAccessToken("test.token");
    const created = { ...row, province: { ...row.province, code: 45 } };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, data: created }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createWorkRequestService(browserRequest).create(input)).resolves.toEqual({
      ...row,
      province: { ...row.province, code: "45" },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects an actual API failure instead of treating it as a successful create", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api/v1");
    setAccessToken("test.token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      success: false,
      error: { code: "INVALID_WORK_REQUEST_REFERENCE", message: "Invalid relation" },
    }, { status: 400 })));
    await expect(createWorkRequestService(browserRequest).create(input))
      .rejects.toMatchObject({ status: 400, code: "INVALID_WORK_REQUEST_REFERENCE" });
  });

  it("loads customer detail and cancels through the verified endpoints", async () => {
    const request = vi.fn(async (options) => options.schema.parse({
      success: true,
      data: options.path.endsWith("/cancel") ? { ...row, status: "CANCELLED" } : row,
    })) as ApiRequestFn;
    const service = createWorkRequestService(request);
    const signal = new AbortController().signal;
    expect(await service.getById(requestId, signal)).toEqual(row);
    expect((await service.cancel(requestId)).status).toBe("CANCELLED");
    expect(request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      path: `/work-requests/${requestId}`, signal,
    }));
    expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      path: `/work-requests/${requestId}/cancel`, method: "POST",
    }));
  });

  it.each([409, 503])("does not retry cancellation failure %s", async (status) => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api/v1");
    setAccessToken("test.token");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      success: false,
      error: { code: "WORK_REQUEST_NOT_CANCELLABLE", message: "Conflict" },
    }, { status }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createWorkRequestService(browserRequest).cancel(requestId))
      .rejects.toMatchObject({ status, code: "WORK_REQUEST_NOT_CANCELLABLE" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses the canonical offer and assigned-work lifecycle endpoints", async () => {
    const requestMock = vi.fn(async (options: Parameters<ApiRequestFn>[0]) => {
      if (options.path.endsWith("/offers") && options.method !== "POST") {
        return options.schema.parse({
          success: true,
          data: [offer],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
      }
      if (options.path.endsWith("/offers")) {
        return options.schema.parse({ success: true, data: offer });
      }
      if (options.path.endsWith("/start")) {
        return options.schema.parse({
          success: true,
          data: { ...row, status: "IN_PROGRESS" },
        });
      }
      if (options.path.endsWith("/complete")) {
        return options.schema.parse({
          success: true,
          data: { ...row, status: "COMPLETED" },
        });
      }
      return options.schema.parse(undefined);
    });
    const request = requestMock as ApiRequestFn & typeof requestMock;
    const service = createWorkRequestService(request);
    const offerInput = {
      amount: offer.amount,
      currency: "TRY" as const,
      description: offer.description,
      expiresAt: offer.expiresAt,
    };

    await expect(service.listOffers(requestId)).resolves.toMatchObject({
      items: [offer],
      meta: { page: 1, total: 1 },
    });
    await service.createOffer(requestId, offerInput);
    await service.acceptOffer(offerId);
    await service.rejectOffer(offerId);
    await expect(service.start(requestId)).resolves.toMatchObject({
      status: "IN_PROGRESS",
    });
    await expect(service.complete(requestId)).resolves.toMatchObject({
      status: "COMPLETED",
    });

    expect(requestMock.mock.calls.map(([options]) => [options.path, options.method])).toEqual([
      [`/work-requests/${requestId}/offers`, undefined],
      [`/work-requests/${requestId}/offers`, "POST"],
      [`/work-offers/${offerId}/accept`, "POST"],
      [`/work-offers/${offerId}/reject`, "POST"],
      [`/work-requests/${requestId}/start`, "POST"],
      [`/work-requests/${requestId}/complete`, "POST"],
    ]);
    expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      body: offerInput,
      auth: "required",
      retries: 0,
    }));
  });

  it("treats a successful empty offer page as an empty state", async () => {
    const request = vi.fn(async (options) => options.schema.parse({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })) as ApiRequestFn;

    await expect(createWorkRequestService(request).listOffers(requestId)).resolves.toEqual({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it("submits a completed-work review without a service verification id", async () => {
    const reviewInput = {
      overallRating: 5 as const,
      serviceDescription: "Engine fault repaired",
      serviceDate: "2026-10-29T12:00:00.000Z",
      amountPaid: 2500,
      resolutionStatus: "YES" as const,
      comment: "The service was completed on time",
      specialtyRatings: [{ specialtyId: ids.specialty, rating: 5 as const }],
    };
    const review = {
      id: "10000000-0000-4000-8000-000000000020",
      workshopId: "10000000-0000-4000-8000-000000000021",
      overallRating: 5,
      comment: reviewInput.comment,
      createdAt: reviewInput.serviceDate,
      serviceDescription: reviewInput.serviceDescription,
      serviceDate: reviewInput.serviceDate,
      resolutionStatus: reviewInput.resolutionStatus,
      verificationStatus: "VERIFIED",
      moderationStatus: "PENDING",
      author: { firstName: "Example", lastName: "Customer" },
      specialtyRatings: [{
        rating: 5,
        specialty: { id: ids.specialty, name: "Engine", slug: "engine" },
      }],
      serviceVerificationId: "10000000-0000-4000-8000-000000000022",
    };
    const requestMock = vi.fn(async (options: Parameters<ApiRequestFn>[0]) =>
      options.schema.parse({ success: true, data: review }),
    );
    const request = requestMock as ApiRequestFn & typeof requestMock;

    await createWorkRequestService(request).createReview(requestId, reviewInput);

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: `/work-requests/${requestId}/review`,
      method: "POST",
      body: reviewInput,
      auth: "required",
      retries: 0,
    }));
    expect(requestMock.mock.calls[0][0].body).not.toHaveProperty("serviceVerificationId");
  });
});
