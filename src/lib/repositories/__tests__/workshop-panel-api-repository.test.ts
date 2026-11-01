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

  it("maps the deployed matching envelope, nullable fields and pagination", async () => {
    const request = {
      id: "request-1", description: "Fren arızası", status: "PUBLISHED",
      vehicleType: { id: "type-1", name: "Otomobil", slug: "otomobil" }, vehicleBrand: null, vehicleModel: null,
      specialty: { id: "specialty-1", name: "Fren", slug: "fren" }, province: { id: "province-1", name: "Ankara", slug: "ankara" }, district: { id: "district-1", name: "Çankaya", slug: "cankaya" }, _count: { photos: 2 },
      address: "Örnek adres",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/work-requests?")) {
        const page = new URL(url).searchParams.get("page");
        return page === "2"
          ? envelope([{ ...request, id: "request-2", description: null, _count: null }], { meta: { page: 2, limit: 20, total: 2, totalPages: 2 } })
          : envelope([request], { meta: { page: 1, limit: 20, total: 2, totalPages: 2 } });
      }
      return envelope([{ id: "offer-1", requestId: request.id, amount: "1250.50", currency: "TRY", description: "Teklif", expiresAt: "2026-10-30T10:00:00.000Z", status: "SUBMITTED", createdAt: "2026-10-24T10:00:00.000Z", updatedAt: "2026-10-24T10:00:00.000Z", request }], { meta: { total: 1 } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const repository = createApiWorkshopPanelRepository();
    const requests = await repository.listRequests();
    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({ id: "request-1", city: "Ankara", photoCount: 2, createdAt: "", vehicle: { brand: "", model: "" } });
    expect(requests[1]).toMatchObject({ id: "request-2", description: { tr: "", en: "" }, photoCount: 0 });
    expect((await repository.listOffers())[0]).toMatchObject({ id: "offer-1", amount: 1250.5, currency: "TRY" });
  });

  it("rejects a successful matching response with an invalid data shape", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => envelope({}, { meta: { page: 1, limit: 20, total: 0, totalPages: 0 } })));
    await expect(createApiWorkshopPanelRepository().listRequests()).rejects.toMatchObject({ kind: "contract" });
  });

  it("uses owner-scoped profile, review and notification endpoints", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); urls.push(url);
      if (url.endsWith("/workshops/mine/profile")) return envelope({ id: "10000000-0000-4000-8000-000000000001", name: "Usta", ownerName: "Ali Usta", email: "", phone: "555", description: null, logoUrl: "/api/v1/workshops/10000000-0000-4000-8000-000000000001/logo", province: { id: "p", name: "Ankara" }, district: { id: "d", name: "Çankaya" }, address: "Adres", status: "PUBLISHED", verificationStatus: "VERIFIED", specialties: [], serviceAreas: [], averageRating: null, reviewCount: 0 });
      if (url.includes("/workshops/mine/reviews")) return envelope([], { summary: { average: 0, total: 0, distribution: [] } });
      return envelope([], { meta: { unread: 0 } });
    }));
    const repository = createApiWorkshopPanelRepository();
    expect(await repository.getProfile()).toMatchObject({ verification: "VERIFIED", email: "", logoUrl: "https://api.test/api/v1/workshops/10000000-0000-4000-8000-000000000001/logo" });
    expect((await repository.listReviews()).reviews).toEqual([]);
    expect(await repository.listNotifications()).toEqual([]);
    expect(urls.some((url) => url.endsWith("/workshops/mine/profile"))).toBe(true);
  });

  it("uses owner service-area and raw logo endpoints", async () => {
    const calls: Array<{ url: string; method: string; body: unknown; contentType: string | null }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body, contentType: new Headers(init?.headers).get("content-type") });
      if (url.endsWith("/workshops/mine/logo") && method === "PUT") return envelope({ logoUrl: "https://cdn.test/logo.webp" });
      if (url.endsWith("/workshops/mine/logo") && method === "DELETE") return new Response(null, { status: 204 });
      return envelope([{ province: { id: "p", name: "Ankara" }, district: { id: "d", name: "Çankaya" } }]);
    }));
    const repository = createApiWorkshopPanelRepository();
    expect(await repository.getServiceAreas()).toEqual([{ provinceId: "p", districtId: "d", city: "Ankara", district: "Çankaya" }]);
    await repository.updateServiceAreas([{ provinceId: "p", districtId: "d" }]);
    const file = new File([new Uint8Array([1, 2, 3])], "logo.webp", { type: "image/webp" });
    expect(await repository.uploadLogo(file)).toBe("https://cdn.test/logo.webp");
    await repository.deleteLogo();
    expect(calls.map(({ method }) => method)).toEqual(["GET", "PUT", "PUT", "DELETE"]);
    expect(calls[2]).toMatchObject({ body: file, contentType: "image/webp" });
  });
});
