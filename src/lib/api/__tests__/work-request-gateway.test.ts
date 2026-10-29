import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { localGateway } from "@/lib/api/local-gateway";

const origin = "http://localhost:3000";
const upstream = "https://api.example.test/api/v1";
const id = "10000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.stubEnv("SITE_URL", origin);
  vi.stubEnv("API_INTERNAL_BASE_URL", upstream);
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", upstream);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function request(path: string, method: string, source = origin): Request {
  const hasBody = method === "POST" && path === "work-requests" || method === "PATCH";
  return new Request(`${origin}/api/local/${path}?page=2`, {
    method,
    headers: { host: "localhost:3000", origin: source, authorization: "Bearer test.token", "content-type": "application/json" },
    ...(hasBody ? { body: JSON.stringify({ description: "Updated diagnosis details" }) } : {}),
  });
}

it.each([
  ["work-requests", "POST"], ["work-requests", "GET"], ["work-requests/mine", "GET"],
  [`work-requests/${id}`, "GET"], [`work-requests/${id}`, "PATCH"],
  [`work-requests/${id}/cancel`, "POST"],
])("forwards verified authenticated route %s %s", async (path, method) => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, data: {} }));
  vi.stubGlobal("fetch", fetchMock);
  expect((await localGateway(request(path, method), path.split("/"))).status).toBe(200);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${upstream}/${path}?page=2`);
  expect(init.headers.get("authorization")).toBe("Bearer test.token");
  expect(init.headers.get("cookie")).toBeNull();
});

it("forwards the validator-compatible create body unchanged", async () => {
  const body = {
    vehicleTypeId: "10000000-0000-4000-8000-000000000002",
    vehicleBrandId: null,
    vehicleModelId: null,
    specialtyId: "10000000-0000-4000-8000-000000000003",
    provinceId: "10000000-0000-4000-8000-000000000004",
    districtId: "10000000-0000-4000-8000-000000000005",
    address: "123 Main Street",
    description: "Engine fault needs diagnosis",
  };
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, data: {} }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  const response = await localGateway(new Request(`${origin}/api/local/work-requests`, {
    method: "POST",
    headers: { host: "localhost:3000", origin, authorization: "Bearer test.token", "content-type": "application/json" },
    body: JSON.stringify(body),
  }), ["work-requests"]);
  expect(response.status).toBe(201);
  expect(fetchMock.mock.calls[0][0]).toBe(`${upstream}/work-requests`);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(body));
});

it.each([
  [`work-requests/${id}/transition`, "POST"],
  [`work-requests/${id}/events`, "GET"], [`work-requests/${id}/cancel`, "PATCH"],
  ["work-requests/not-a-uuid", "GET"],
])("rejects unverified route %s %s before fetching", async (path, method) => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect((await localGateway(request(path, method), path.split("/"))).status).toBe(404);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("rejects cross-origin create before fetching", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect((await localGateway(request("work-requests", "POST", "https://other.test"), ["work-requests"])).status).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("preserves cancellation conflicts", async () => {
  const failure = { success: false, error: { code: "WORK_REQUEST_NOT_CANCELLABLE", message: "Conflict" } };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(failure, { status: 409 })));
  const path = `work-requests/${id}/cancel`;
  const response = await localGateway(request(path, "POST"), path.split("/"));
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual(failure);
});
