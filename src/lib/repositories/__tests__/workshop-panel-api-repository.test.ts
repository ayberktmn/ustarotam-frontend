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
    expect(await repository.listReviews()).toEqual({ reviews: [], summary: { average: 0, total: 0, distribution: [] } });
    expect(await repository.listNotifications()).toEqual([]);
    expect(urls.some((url) => url.endsWith("/workshops/mine/profile"))).toBe(true);
  });

  it("uses owner service-area and raw logo endpoints", async () => {
    const calls: Array<{ url: string; method: string; body: unknown; contentType: string | null }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body, contentType: new Headers(init?.headers).get("content-type") });
      if (url.endsWith("/workshops/mine/logo") && method === "PUT") return envelope({ logoUrl: "https://cdn.test/logo.webp" });
      if (url.endsWith("/workshops/mine/logo") && method === "DELETE") return envelope({ logoUrl: null });
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

  it("uses canonical conversation routes and normalizes workshop message ownership", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET"; calls.push({ url, method });
      if (url.includes("/conversations/") && url.endsWith("/messages") && method === "POST") {
        return envelope({ id: "message-2", body: "Yanıt", sender: "CUSTOMER", createdAt: "2026-10-24T11:00:00.000Z", readAt: null });
      }
      if (url.includes("/conversations/") && url.includes("/messages?")) {
        return envelope([{ id: "message-1", body: "Merhaba", sender: "WORKSHOP", createdAt: "2026-10-24T10:00:00.000Z", readAt: null }], { meta: { page: 1, limit: 100, total: 1, totalPages: 1 } });
      }
      return envelope({ id: "request-1:workshop-1", requestId: "request-1", customerName: "Ayşe", requestTitle: "Fren işi", lastMessage: "Merhaba", lastMessageAt: "2026-10-24T10:00:00.000Z", unreadCount: 1 });
    }));
    const repository = createApiWorkshopPanelRepository();
    const conversation = await repository.getConversation("request-1:workshop-1");
    expect(conversation.messages[0]).toMatchObject({ sender: "CUSTOMER", body: { tr: "Merhaba", en: "Merhaba" } });
    expect(await repository.sendMessage("request-1:workshop-1", "Yanıt")).toMatchObject({ sender: "WORKSHOP" });
    expect(calls).toEqual([
      { url: "https://api.test/api/v1/conversations/request-1%3Aworkshop-1", method: "GET" },
      { url: "https://api.test/api/v1/conversations/request-1%3Aworkshop-1/messages?page=1&limit=100", method: "GET" },
      { url: "https://api.test/api/v1/conversations/request-1%3Aworkshop-1/messages", method: "POST" },
    ]);
  });

  it("maps notification events to translation keys without rendering backend copy", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => envelope([
      { id: "n-1", type: "OFFER_ACCEPTED", title: "Offer accepted", body: "Your offer was accepted by the request owner.", requestId: "r-1", readAt: null, createdAt: "2026-10-24T10:00:00.000Z" },
      { id: "n-2", type: "REQUEST_STATUS", title: "Work started", body: "Started", requestId: "r-1", readAt: "2026-10-24T11:00:00.000Z", createdAt: "2026-10-24T10:00:00.000Z" },
    ], { meta: { unread: 1 } })));
    const notifications = await createApiWorkshopPanelRepository().listNotifications();
    expect(notifications).toMatchObject([
      { translationKey: "OFFER_ACCEPTED", title: { tr: "", en: "" }, read: false },
      { translationKey: "WORK_STARTED", title: { tr: "", en: "" }, read: true },
    ]);
  });
});
