import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createFetchMock, failureResponse, jsonResponse, TEST_API_BASE_URL } from "./helpers";
import { PDF_MIME } from "@/lib/workshop-application";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", TEST_API_BASE_URL);
  vi.stubGlobal("window", {location: {hostname: "localhost"}, dispatchEvent: vi.fn()});
});
afterEach(() => {vi.unstubAllGlobals(); vi.unstubAllEnvs();});

const realMineApplication = {
  id: "00000000-0000-4000-8000-000000000001", ownerId: "00000000-0000-4000-8000-000000000002",
  name: "Deneme Servis", slug: "deneme-servis-abc123", description: null, phone: "05444333221", email: null,
  website: null, address: "Test adresi", postalCode: null, latitude: null, longitude: null, businessType: "SAHIS",
  verificationStatus: "PENDING", verificationNote: null, verifiedAt: null, createdAt: "2026-10-28T16:46:44.496Z",
  updatedAt: "2026-10-28T16:46:44.496Z", province: {id: "00000000-0000-4000-8000-000000000010", code: 45, name: "Manisa", slug: "manisa"},
  district: {id: "00000000-0000-4000-8000-000000000011", name: "Sehzadeler", slug: "sehzadeler"}, industrialSite: null,
  vehicleTypes: [{vehicleType: {id: "v1", name: "Otomobil", slug: "otomobil"}}], brands: [],
  specialties: [{specialty: {id: "s1", name: "Aku", slug: "aku", description: null}}],
};

it("parses the real mine response and normalizes verification status and nested relations", async () => {
  const {fetchMock} = createFetchMock(() => jsonResponse({success: true, data: [realMineApplication], meta: {page: 1, limit: 100, total: 1, totalPages: 1}}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  await expect(workshopApplicationService.mine()).resolves.toEqual([expect.objectContaining({
    id: realMineApplication.id, status: "PENDING", businessType: "SAHIS",
    vehicleTypes: [{id: "v1", name: "Otomobil", slug: "otomobil"}],
    specialties: [{id: "s1", name: "Aku", slug: "aku", description: null}],
  })]);
});

it("preserves the backend rejectionReason from the mine response", async () => {
  const rejectionReason = "İşyeri açma ruhsatı okunamadı.";
  const rejectedApplication = {...realMineApplication, verificationStatus: "REJECTED", rejectionReason};
  const {fetchMock} = createFetchMock(() => jsonResponse({success: true, data: [rejectedApplication], meta: {page: 1, limit: 100, total: 1, totalPages: 1}}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  await expect(workshopApplicationService.mine()).resolves.toEqual([
    expect.objectContaining({status: "REJECTED", rejectionReason}),
  ]);
});

const application = {applicationId: "application-id", status: "PENDING", name: "Test Servis", businessType: "SAHIS", phone: "05551234567", address: "Test adresi", province: {id: "p", name: "Ankara"}, district: {id: "d", name: "Çankaya"}, vehicleTypes: [], brands: [], specialties: []};

it("reads and validates the paginated application list", async () => {
  const {fetchMock, calls} = createFetchMock(() => jsonResponse({success: true, data: [application], meta: {page: 1, limit: 20, total: 1, totalPages: 1}}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  expect(await workshopApplicationService.mine()).toEqual([expect.objectContaining({id: "application-id", status: "PENDING"})]);
  expect(calls[0].url).toBe("/api/local/workshop-applications/mine?page=1&limit=100");
  expect(new Headers(calls[0].init.headers).get("authorization")).toBe("Bearer token");
});

it("patches province and district UUIDs on the existing draft", async () => {
  const draft = {...application, id: "00000000-0000-4000-8000-000000000099", applicationId: undefined, status: "DRAFT"};
  const {fetchMock, calls} = createFetchMock(() => jsonResponse({success: true, data: draft}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  await workshopApplicationService.updateDraft(draft.id, {provinceId: "00000000-0000-4000-8000-000000000010", districtId: "00000000-0000-4000-8000-000000000011"});
  expect(calls[0].url).toBe(`/api/local/workshop-applications/${draft.id}`);
  expect(calls[0].init.method).toBe("PATCH");
  expect(JSON.parse(String(calls[0].init.body))).toEqual({provinceId: "00000000-0000-4000-8000-000000000010", districtId: "00000000-0000-4000-8000-000000000011"});
});

it("reads every page so a pending application cannot be missed", async () => {
  const older = {...application, applicationId: "older-id", status: "REJECTED"};
  const pending = {...application, applicationId: "pending-id"};
  const {fetchMock, calls} = createFetchMock((call) => call.url.includes("page=1")
    ? jsonResponse({success: true, data: [older], meta: {page: 1, limit: 1, total: 2, totalPages: 2}})
    : jsonResponse({success: true, data: [pending], meta: {page: 2, limit: 1, total: 2, totalPages: 2}}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  await expect(workshopApplicationService.mine()).resolves.toEqual([
    expect.objectContaining({id: "older-id", status: "REJECTED"}),
    expect.objectContaining({id: "pending-id", status: "PENDING"}),
  ]);
  expect(calls.map(call => call.url)).toEqual([
    "/api/local/workshop-applications/mine?page=1&limit=100",
    "/api/local/workshop-applications/mine?page=2&limit=100",
  ]);
});

it("treats an empty paginated mine response as no application", async () => {
  const {fetchMock} = createFetchMock(() => jsonResponse({success: true, data: [], meta: {page: 1, limit: 20, total: 0, totalPages: 0}}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  await expect(workshopApplicationService.mine()).resolves.toEqual([]);
});

it.each(["SAHIS", "LIMITED", "ANONIM"] as const)("creates a %s application with the exact backend enum and catalog IDs", async businessType => {
  const {fetchMock, calls} = createFetchMock(() => jsonResponse({success: true, data: application}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  const input = {name: "Test Servis", businessType, phone: "05551234567", address: "Test adresi", provinceId: "p", districtId: "d", industrialSiteId: null, vehicleTypeIds: ["v"], brandIds: [], specialtyIds: ["s"]};
  const created = await workshopApplicationService.create(input);
  expect(calls[0].url).toBe("/api/local/workshop-applications");
  expect(JSON.parse(String(calls[0].init.body))).toEqual(input);
  expect(created.id).toBe("application-id");
});

it("rejects an application response without id or applicationId", async () => {
  const withoutId = {...application, applicationId: undefined};
  const {fetchMock} = createFetchMock(() => jsonResponse({success: true, data: withoutId}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  await expect(workshopApplicationService.create({name: "Test", businessType: "SAHIS", phone: "05551234567", address: "Test adresi", provinceId: "p", districtId: "d", industrialSiteId: null, vehicleTypeIds: [], brandIds: [], specialtyIds: []})).rejects.toMatchObject({kind: "contract"});
});

it("rejects an invalid business type before sending the POST request", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  expect(() => workshopApplicationService.create({name: "Test", businessType: "sole" as never, phone: "05551234567", address: "Test adresi", provinceId: "p", districtId: "d", industrialSiteId: null, vehicleTypeIds: [], brandIds: [], specialtyIds: []})).toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("uploads the original binary with the supplied ID and document type", async () => {
  const document = {id: "document-id", documentType: "TAX_CERTIFICATE", status: "PENDING", originalName: "test.pdf"};
  const {fetchMock, calls} = createFetchMock(() => jsonResponse({success: true, data: document}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  const file = new File([new Uint8Array([37, 80, 68, 70, 0, 255])], "test.pdf", {type: PDF_MIME});
  await workshopApplicationService.uploadDocument("returned-application-id", "TAX_CERTIFICATE", file);
  expect(calls[0].url).toBe("/api/local/workshop-applications/returned-application-id/documents/TAX_CERTIFICATE");
  expect(calls[0].init.body).toBe(file);
  expect(new Headers(calls[0].init.headers).get("content-type")).toBe(PDF_MIME);
  expect(calls[0].init.method).toBe("POST");
  expect(calls[0].init.body).not.toBeInstanceOf(FormData);
});

it("downloads an application document with the authenticated API client", async () => {
  const bytes = new Uint8Array([37, 80, 68, 70]);
  const {fetchMock, calls} = createFetchMock(() => new Response(bytes, {status: 200, headers: {"content-type": PDF_MIME}}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  const file = await workshopApplicationService.downloadDocument("returned-application-id", "document-id");
  expect(calls[0].url).toBe("/api/local/workshop-applications/returned-application-id/documents/document-id");
  expect(new Headers(calls[0].init.headers).get("authorization")).toBe("Bearer token");
  expect(file.type).toBe(PDF_MIME);
});

it("rejects unsupported documents and path traversal before making a request", async () => {
  const mock = vi.fn(); vi.stubGlobal("fetch", mock);
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  const file = new File(["test"], "test.png", {type: "image/png"});
  expect(() => workshopApplicationService.uploadDocument("test-id", "TAX_CERTIFICATE", file)).toThrow();
  expect(() => workshopApplicationService.documents("../mine")).toThrow();
  expect(mock).not.toHaveBeenCalled();
});

it.each([400, 413, 415, 503])("preserves upload error %s without retrying", async status => {
  const {fetchMock, calls} = createFetchMock(() => failureResponse(status, {code: "UPLOAD_FAILED"}));
  vi.stubGlobal("fetch", fetchMock);
  const {setAccessToken} = await import("../token-store"); setAccessToken("token");
  const {workshopApplicationService} = await import("../endpoints/workshop-applications");
  await expect(workshopApplicationService.uploadDocument("test-id", "TAX_CERTIFICATE", new File(["%PDF"], "test.pdf", {type: PDF_MIME}))).rejects.toMatchObject({status});
  expect(calls).toHaveLength(1);
});
