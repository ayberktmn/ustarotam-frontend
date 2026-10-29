import { afterEach, describe, expect, it, vi } from "vitest";
import { createCatalogService } from "@/lib/api/endpoints/catalog";
import type { ApiRequestFn } from "@/lib/api/client";

describe("province catalog HTTP contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps all 81 API provinces for the registration dropdown", async () => {
    const provinces = Array.from({ length: 81 }, (_, index) => ({ id: `province-${index + 1}`, code: index + 1, name: `İl ${index + 1}`, slug: `il-${index + 1}` }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: provinces, meta: { count: 81 } }), { status: 200, headers: { "content-type": "application/json" } })));
    const service = createCatalogService(async (options) => {
      const response = await fetch(`https://api.test${options.path}`);
      return options.schema.parse(await response.json());
    });
    await expect(service.getProvinces()).resolves.toHaveLength(81);
  });

  it("uses the province UUID and forwards the abort signal without adding pagination", async () => {
    const signal = new AbortController().signal;
    const requestMock = vi.fn(async options => options.schema.parse({success: true, data: [{id: "district-id", name: "District"}], meta: {count: 1}}));
    const request = requestMock as ApiRequestFn;
    const service = createCatalogService(request);
    await expect(service.getDistricts("province-uuid", {signal})).resolves.toEqual([{id: "district-id", name: "District"}]);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: "/locations/provinces/province-uuid/districts",
      signal,
      auth: "none",
      responseMode: "raw",
    }));
    expect(requestMock.mock.calls[0][0].query).toBeUndefined();
  });
});
