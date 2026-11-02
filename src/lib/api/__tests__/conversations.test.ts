import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browserRequest } from "@/lib/api/client";
import { createConversationService } from "@/lib/api/endpoints/conversations";
import { clearAccessToken, setAccessToken } from "@/lib/api/token-store";

const envelope = (data: unknown, extra: Record<string, unknown> = {}, status = 200) => new Response(JSON.stringify({ success: true, data, ...extra }), { status, headers: { "content-type": "application/json" } });

describe("customer conversation contract", () => {
  beforeEach(() => { process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.test/api/v1"; setAccessToken("customer-token"); });
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); });

  it("creates one conversation and renders both sender directions in the correct thread", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET"; calls.push({ url, method });
      if (method === "POST" && url.endsWith("/conversations")) return envelope({ id: "request-1:workshop-1", requestId: "request-1", offerId: "offer-1" });
      if (url.includes("/messages?") && method === "GET") return envelope([
        { id: "m-1", body: "Ustadan mesaj", sender: "WORKSHOP", createdAt: "2026-11-02T10:00:00.000Z", readAt: null },
        { id: "m-2", body: "Müşteri yanıtı", sender: "CUSTOMER", createdAt: "2026-11-02T10:01:00.000Z", readAt: null },
      ], { meta: { page: 1, limit: 100, total: 2, totalPages: 1 } });
      return envelope({ id: "request-1:workshop-1", requestId: "request-1", customerName: "Örnek Servis", requestTitle: "Fren işi", lastMessage: "Müşteri yanıtı", lastMessageAt: "2026-11-02T10:01:00.000Z", unreadCount: 1 });
    }));
    const service = createConversationService(browserRequest);
    const id = await service.create("offer-1");
    const thread = await service.get(id);
    expect(thread.customerName).toBe("Örnek Servis");
    expect(thread.messages.map(({ sender, body }) => [sender, body.tr])).toEqual([["WORKSHOP", "Ustadan mesaj"], ["CUSTOMER", "Müşteri yanıtı"]]);
    expect(calls.map(({ method }) => method)).toEqual(["POST", "GET", "GET"]);
  });
});
