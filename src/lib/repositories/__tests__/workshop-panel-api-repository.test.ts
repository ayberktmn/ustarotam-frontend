import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiWorkshopPanelRepository } from "@/lib/repositories/workshop-panel-api-repository";
import { clearAccessToken, setAccessToken } from "@/lib/api/token-store";

const envelope = (data: unknown, extra: Record<string, unknown> = {}) => new Response(JSON.stringify({ success: true, data, ...extra }), { status: 200, headers: { "content-type": "application/json" } });

describe("workshop panel API repository", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.test/api/v1";
    setAccessToken("verified-owner-token");
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  it("maps matching requests and workshop offers without mock data", async () => {
    const request = {
      id: "request-1", description: "Fren arızası", status: "PUBLISHED", createdAt: "2026-10-24T10:00:00.000Z",
      vehicleType: { name: "Otomobil" }, vehicleBrand: { name: "Toyota" }, vehicleModel: { name: "Corolla" },
      specialty: { name: "Fren" }, province: { name: "Ankara" }, district: { name: "Çankaya" }, _count: { photos: 2 },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/work-offers/matching")
      ? envelope([request], { meta: { total: 1 } })
      : envelope([{ id: "offer-1", requestId: request.id, amount: "1250.50", currency: "TRY", description: "Teklif", expiresAt: "2026-10-30T10:00:00.000Z", status: "SUBMITTED", createdAt: "2026-10-24T10:00:00.000Z", updatedAt: "2026-10-24T10:00:00.000Z", request }], { meta: { total: 1 } }));
    vi.stubGlobal("fetch", fetchMock);
    const repository = createApiWorkshopPanelRepository();
    expect((await repository.listRequests())[0]).toMatchObject({ id: "request-1", city: "Ankara", photoCount: 2 });
    expect((await repository.listOffers())[0]).toMatchObject({ id: "offer-1", amount: 1250.5, currency: "TRY" });
  });

  it("uses owner-scoped profile, review and notification endpoints", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); urls.push(url);
      if (url.endsWith("/workshops/mine/profile")) return envelope({ id: "workshop", name: "Usta", ownerName: "Ali Usta", email: "owner@example.test", phone: "555", description: null, province: { id: "p", name: "Ankara" }, district: { id: "d", name: "Çankaya" }, address: "Adres", status: "PUBLISHED", verificationStatus: "VERIFIED", specialties: [], serviceAreas: [], averageRating: null, reviewCount: 0 });
      if (url.includes("/workshops/mine/reviews")) return envelope([], { summary: { average: 0, total: 0, distribution: [] } });
      return envelope([], { meta: { unread: 0 } });
    }));
    const repository = createApiWorkshopPanelRepository();
    expect((await repository.getProfile()).verification).toBe("VERIFIED");
    expect((await repository.listReviews()).reviews).toEqual([]);
    expect(await repository.listNotifications()).toEqual([]);
    expect(urls.some((url) => url.endsWith("/workshops/mine/profile"))).toBe(true);
  });
});
