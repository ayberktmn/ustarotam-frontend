import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { localGateway, localizeRefreshCookie } from "../local-gateway";
import { failureResponse, successEnvelope } from "./helpers";

const upstream = "https://api.example.test/api/v1";
const origin = "http://localhost:3000";
const sessionCookie = "ustarotam_refresh=opaque.refresh.token; Max-Age=2592000; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict";

it.each(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"])("forwards raw %s document bytes with bearer and no cookie", async mime => {
  const bytes = new Uint8Array([0, 255, 37, 80, 68, 70, 128]);
  const fetchMock = vi.fn().mockResolvedValue(Response.json({opaqueResponse: true}, {status: 201}));
  vi.stubGlobal("fetch", fetchMock);
  const path = "workshop-applications/returned-id/documents/TAX_CERTIFICATE";
  const req = new Request(`${origin}/api/local/${path}`, {method: "POST", headers: {host: "localhost:3000", origin, "content-type": mime, authorization: "Bearer token", cookie: "usta_rotam_dev_refresh=secret"}, body: bytes});
  const response = await localGateway(req, path.split("/"));
  expect(response.status).toBe(201);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${upstream}/${path}`);
  expect(new Uint8Array(init.body)).toEqual(bytes);
  expect(init.headers.get("content-type")).toBe(mime);
  expect(init.headers.get("authorization")).toBe("Bearer token");
  expect(init.headers.get("cookie")).toBeNull();
});

it("forwards an owned application document read as an attachment", async () => {
  const path = "workshop-applications/returned-id/documents/document-id";
  const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array([37, 80, 68, 70]), {
    status: 200,
    headers: { "content-type": "application/pdf" },
  }));
  vi.stubGlobal("fetch", fetchMock);
  const response = await localGateway(request(path, "GET", {authorization: "Bearer token"}), path.split("/"));
  expect(response.status).toBe(200);
  expect(fetchMock.mock.calls[0][0]).toBe(`${upstream}/${path}`);
  expect(fetchMock.mock.calls[0][1].headers.get("authorization")).toBe("Bearer token");
  expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(response.headers.get("content-disposition")).toBe("attachment");
});

it.each([[10 * 1024 * 1024 + 1, "application/pdf", 413], [3, "multipart/form-data", 415], [0, "application/pdf", 400]] as const)("rejects invalid binary payload of %s bytes (%s)", async (size, mime, status) => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const path = "workshop-applications/returned-id/documents/WORKPLACE_LICENSE";
  const req = new Request(`${origin}/api/local/${path}`, {method: "POST", headers: {host: "localhost:3000", origin, "content-type": mime}, body: new Uint8Array(size)});
  expect((await localGateway(req, path.split("/"))).status).toBe(status);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("rejects cross-origin application uploads and unrecognized document types", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const path = "workshop-applications/returned-id/documents/TAX_CERTIFICATE";
  expect((await localGateway(request(path, "POST", {origin: "https://attacker.test"}), path.split("/"))).status).toBe(403);
  const invalid = "workshop-applications/returned-id/documents/OTHER";
  expect((await localGateway(request(invalid, "POST"), invalid.split("/"))).status).toBe(404);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("supports the configured deployed HTTPS origin and preserves Secure cookies", async () => {
  vi.stubEnv("SITE_URL", "https://app.example.test");
  const fetchMock = vi.fn().mockResolvedValue(Response.json({success: true}, {headers: {"set-cookie": sessionCookie}}));
  vi.stubGlobal("fetch", fetchMock);
  const req = new Request("https://app.example.test/api/local/auth/login", {method: "POST", headers: {host: "app.example.test", origin: "https://app.example.test", "content-type": "application/json"}, body: JSON.stringify({email: "user@example.test", password: "mock-only"})});
  const response = await localGateway(req, ["auth", "login"]);
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("; Secure");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Strict");
});
function request(path: string, method = "GET", options: { origin?: string; cookie?: string; body?: string; authorization?: string } = {}): Request {
  const headers = new Headers({ host: "localhost:3000" });
  if (method !== "GET") headers.set("origin", options.origin ?? origin);
  if (options.cookie) headers.set("cookie", options.cookie);
  if (options.authorization) headers.set("authorization", options.authorization);
  if (options.body) headers.set("content-type", "application/json");
  return new Request(`${origin}/api/local/${path}`, {method, headers, body: options.body});
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("SITE_URL", origin);
  vi.stubEnv("API_INTERNAL_BASE_URL", upstream);
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", upstream);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("forwards profile PATCH body and bearer without cookies", async () => {
  const body = JSON.stringify({ firstName: "Updated", lastName: "Name" });
  const fetchMock = vi.fn().mockResolvedValue(successEnvelope({ firstName: "Updated" }));
  vi.stubGlobal("fetch", fetchMock);
  const response = await localGateway(request("auth/me", "PATCH", { body, authorization: "Bearer test.token", cookie: "usta_rotam_dev_refresh=secret" }), ["auth", "me"]);
  expect(response.status).toBe(200);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${upstream}/auth/me`);
  expect(init.method).toBe("PATCH");
  expect(init.body).toBe(body);
  expect(init.headers.get("authorization")).toBe("Bearer test.token");
  expect(init.headers.get("cookie")).toBeNull();
});

it("rejects cross-origin profile PATCH and PATCH on other routes", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect((await localGateway(request("auth/me", "PATCH", { origin: "https://attacker.test" }), ["auth", "me"])).status).toBe(403);
  expect((await localGateway(request("auth/login", "PATCH"), ["auth", "login"])).status).toBe(404);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("allows public workshop review reads through the local gateway", async () => {
  const fetchMock = vi.fn().mockResolvedValue(successEnvelope([], {headers: {"content-type": "application/json"}}));
  vi.stubGlobal("fetch", fetchMock);
  const id = "10000000-0000-4000-8000-000000000001";
  const response = await localGateway(request(`workshops/${id}/reviews?page=1&limit=20`), ["workshops", id, "reviews"]);
  expect(response.status).toBe(200);
  expect(fetchMock.mock.calls[0][0]).toBe(`${upstream}/workshops/${id}/reviews?page=1&limit=20`);
});

it("forwards owner workshop profile, paginated list, reviews and profile updates", async () => {
  const fetchMock = vi.fn().mockResolvedValue(successEnvelope([], {headers: {"content-type": "application/json"}}));
  vi.stubGlobal("fetch", fetchMock);
  for (const path of ["workshops/mine?page=2&limit=5", "workshops/mine/profile", "workshops/mine/reviews?page=1&limit=20"]) {
    const segments = path.split("?")[0].split("/");
    expect((await localGateway(request(path, "GET", {authorization: "Bearer test.token"}), segments)).status).toBe(200);
  }
  const id = "10000000-0000-4000-8000-000000000001";
  expect((await localGateway(request(`workshops/${id}`, "PATCH", {body: JSON.stringify({name: "Updated"}), authorization: "Bearer test.token"}), ["workshops", id])).status).toBe(200);
  expect(fetchMock.mock.calls.every(([, init]) => init.headers.get("authorization") === "Bearer test.token")).toBe(true);
});

it("forwards the exact login contract to the fixed HTTPS target and creates an isolated HttpOnly local cookie", async () => {
  const fetchMock = vi.fn().mockResolvedValue(successEnvelope({accessToken: "access", user: {emailVerified: true}}, {headers: {"content-type": "application/json", "set-cookie": sessionCookie}}));
  vi.stubGlobal("fetch", fetchMock);
  const loginBody = {email: "example@example.test", password: "mock-only", rememberMe: true};
  const response = await localGateway(request("auth/login", "POST", {body: JSON.stringify(loginBody), cookie: "unrelated=secret"}), ["auth", "login"]);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({data: {accessToken: "access"}});
  expect(response.headers.get("set-cookie")).toBe("usta_rotam_dev_refresh=opaque.refresh.token; Path=/api/local/auth; HttpOnly; SameSite=Strict; Max-Age=2592000");
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${upstream}/auth/login`);
  expect(init.redirect).toBe("manual");
  expect(init.headers.get("cookie")).toBeNull();
  expect(init.headers.get("origin")).toBeNull();
  expect(JSON.parse(init.body)).toEqual(loginBody);
});

it("preserves the backend login validation code without exposing details", async () => {
  const fetchMock = vi.fn().mockResolvedValue(failureResponse(400, {code: "VALIDATION_ERROR", headers: {"content-type": "application/json"}}));
  vi.stubGlobal("fetch", fetchMock);
  const response = await localGateway(request("auth/login", "POST", {body: JSON.stringify({email: "invalid", password: "x", rememberMe: true})}), ["auth", "login"]);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({error: {code: "VALIDATION_ERROR"}});
});

it.each([
  [400, "VALIDATION_ERROR"],
  [401, "INVALID_CREDENTIALS"],
  [403, "EMAIL_NOT_VERIFIED"],
  [429, "AUTH_RATE_LIMITED"],
  [500, "INTERNAL_SERVER_ERROR"],
])("passes through login status %s and its safe code", async (status, code) => {
  const fetchMock = vi.fn().mockResolvedValue(failureResponse(status as number, {
    code: code as string,
    headers: {"content-type": "application/json", "set-cookie": "unexpected=ignored"},
  }));
  vi.stubGlobal("fetch", fetchMock);
  const response = await localGateway(request("auth/login", "POST", {body: JSON.stringify({email: "example@example.test", password: "mock-only", rememberMe: false})}), ["auth", "login"]);
  expect(response.status).toBe(status);
  expect(await response.json()).toMatchObject({error: {code}});
  expect(response.headers.get("set-cookie")).toBeNull();
});

it("supports the Next.js fetch Headers fallback when getSetCookie is unavailable", async () => {
  const responseHeaders = new Headers({"content-type": "application/json", "set-cookie": sessionCookie});
  const upstreamResponse = new Response(JSON.stringify({success: true, data: {accessToken: "access", user: {emailVerified: true}}}), {status: 200, headers: responseHeaders});
  Object.defineProperty(upstreamResponse.headers, "getSetCookie", {value: undefined});
  const fetchMock = vi.fn().mockResolvedValue(upstreamResponse);
  vi.stubGlobal("fetch", fetchMock);
  const response = await localGateway(request("auth/login", "POST", {body: JSON.stringify({email: "example@example.test", password: "mock-only", rememberMe: true})}), ["auth", "login"]);
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("usta_rotam_dev_refresh=opaque.refresh.token");
});

it.each([
  [false, "ustarotam_refresh=session-token; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict", false],
  [true, sessionCookie, true],
])("forwards rememberMe=%s and preserves the corresponding cookie lifetime", async (rememberMe, upstreamCookie, persistent) => {
  const fetchMock = vi.fn().mockResolvedValue(successEnvelope({accessToken: "access", user: {emailVerified: true}}, {headers: {"content-type": "application/json", "set-cookie": upstreamCookie as string}}));
  vi.stubGlobal("fetch", fetchMock);
  const body = {email: "example@example.test", password: "mock-only", rememberMe};
  const response = await localGateway(request("auth/login", "POST", {body: JSON.stringify(body)}), ["auth", "login"]);
  expect(response.status).toBe(200);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(body);
  expect(response.headers.get("set-cookie")?.includes("Max-Age=")).toBe(persistent);
});

it("uses the same cookie after reload/new tab for refresh, rotates it, and forwards bearer only to me", async () => {
  let rotation = 0;
  let browserCookie = "opaque.refresh.token";
  const fetchMock = vi.fn().mockImplementation(async () => successEnvelope({accessToken: "renewed"}, {headers: {"content-type": "application/json", "set-cookie": sessionCookie.replace("opaque.refresh.token", `rotated.${++rotation}`)}}));
  vi.stubGlobal("fetch", fetchMock);
  for (let tab = 0; tab < 2; tab++) {
    const response = await localGateway(request("auth/refresh", "POST", {cookie: `analytics=private; usta_rotam_dev_refresh=${browserCookie}`}), ["auth", "refresh"]);
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[tab][1].headers.get("cookie")).toBe(`ustarotam_refresh=${browserCookie}`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    browserCookie = `rotated.${tab + 1}`;
    expect(response.headers.get("set-cookie")).toContain(`usta_rotam_dev_refresh=${browserCookie};`);
  }
  fetchMock.mockResolvedValueOnce(successEnvelope({emailVerified: true}));
  expect((await localGateway(request("auth/me", "GET", {authorization: "Bearer access", cookie: "usta_rotam_dev_refresh=secret"}), ["auth", "me"])).status).toBe(200);
  const headers = fetchMock.mock.calls[2][1].headers;
  expect(headers.get("authorization")).toBe("Bearer access");
  expect(headers.get("cookie")).toBeNull();
});

it("clears the correctly scoped cookie on logout", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 204, headers: {"set-cookie": "ustarotam_refresh=; Path=/api/v1/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict"}})));
  const response = await localGateway(request("auth/logout", "POST", {cookie: "usta_rotam_dev_refresh=token"}), ["auth", "logout"]);
  expect(response.status).toBe(204);
  expect(response.headers.get("set-cookie")).toContain("Path=/api/local/auth; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970");
});

it.each([[403, "EMAIL_NOT_VERIFIED"], [401, "INVALID_REFRESH_TOKEN"]])("preserves backend auth errors %s", async (status, code) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failureResponse(status as number, {code: code as string, headers: {"content-type": "application/json"}})));
  const response = await localGateway(request("auth/refresh", "POST", {cookie: "usta_rotam_dev_refresh=token"}), ["auth", "refresh"]);
  expect(response.status).toBe(status);
  expect(await response.json()).toMatchObject({error: {code}});
});

it("does not contact the upstream auth service when the refresh cookie is absent", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const refresh = await localGateway(request("auth/refresh", "POST"), ["auth", "refresh"]);
  expect(refresh.status).toBe(401);
  expect(await refresh.json()).toMatchObject({error: {code: "REFRESH_TOKEN_MISSING"}});
  expect((await localGateway(request("auth/logout", "POST"), ["auth", "logout"])).status).toBe(204);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("accepts Next.js empty POST streams for refresh without requiring JSON", async () => {
  const headers = new Headers({host: "localhost:3000", origin, cookie: "usta_rotam_dev_refresh=token"});
  const incoming = new Request(`${origin}/api/local/auth/refresh`, {
    method: "POST",
    headers,
    body: new Uint8Array(0),
  });
  const fetchMock = vi.fn().mockResolvedValue(successEnvelope({accessToken: "renewed"}, {
    headers: {"content-type": "application/json", "set-cookie": sessionCookie},
  }));
  vi.stubGlobal("fetch", fetchMock);
  const response = await localGateway(incoming, ["auth", "refresh"]);
  expect(response.status).toBe(200);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${upstream}/auth/refresh`);
  expect(init.body).toBeUndefined();
  expect(init.headers.get("content-type")).toBeNull();
  expect(init.headers.get("cookie")).toBe("ustarotam_refresh=token");
});

it("treats a cleared empty refresh cookie as absent instead of returning 400", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const refresh = await localGateway(request("auth/refresh", "POST", {cookie: "usta_rotam_dev_refresh="}), ["auth", "refresh"]);
  expect(refresh.status).toBe(401);
  expect(await refresh.json()).toMatchObject({error: {code: "REFRESH_TOKEN_MISSING"}});
  expect((await localGateway(request("auth/logout", "POST", {cookie: "usta_rotam_dev_refresh="}), ["auth", "logout"])).status).toBe(204);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("forwards all 81 provinces without forwarding browser cookies", async () => {
  const provinces = Array.from({length: 81}, (_, id) => ({id, name: `Province ${id}`}));
  const fetchMock = vi.fn().mockResolvedValue(successEnvelope(provinces));
  vi.stubGlobal("fetch", fetchMock);
  const response = await localGateway(request("locations/provinces", "GET", {cookie: "usta_rotam_dev_refresh=secret"}), ["locations", "provinces"]);
  expect((await response.json()).data).toHaveLength(81);
  expect(fetchMock.mock.calls[0][1].headers.get("cookie")).toBeNull();
});

it("rejects cross-origin and missing-origin mutations before fetching", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  expect((await localGateway(request("auth/login", "POST", {origin: "https://attacker.test"}), ["auth", "login"])).status).toBe(403);
  const req = request("auth/refresh", "POST"); req.headers.delete("origin");
  expect((await localGateway(req, ["auth", "refresh"])).status).toBe(403);
  const crossSite = request("auth/logout", "POST"); crossSite.headers.set("sec-fetch-site", "cross-site");
  expect((await localGateway(crossSite, ["auth", "logout"])).status).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("rejects DNS rebinding hosts, unlisted paths, traversal and insecure upstream config", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const req = request("auth/refresh", "POST"); req.headers.set("host", "attacker.test");
  expect((await localGateway(req, ["auth", "refresh"])).status).toBe(403);
  for (const path of [["admin"], ["auth", "..", "login"], ["https:", "attacker.test"], ["auth", "email-verification", "confirm"]]) {
    expect((await localGateway(request("unknown"), path)).status).toBe(404);
  }
  vi.stubEnv("API_INTERNAL_BASE_URL", "http://api.example.test/api/v1");
  expect((await localGateway(request("auth/refresh", "POST"), ["auth", "refresh"])).status).toBe(503);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("supports local production builds with the same cookie and origin restrictions", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const fetchMock = vi.fn().mockResolvedValue(successEnvelope({accessToken: "access"}, {headers: {"content-type": "application/json", "set-cookie": sessionCookie}}));
  vi.stubGlobal("fetch", fetchMock);
  const response = await localGateway(request("auth/login", "POST"), ["auth", "login"]);
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("Path=/api/local/auth; HttpOnly; SameSite=Strict");
  expect((await localGateway(request("auth/login", "POST", {origin: "https://attacker.test"}), ["auth", "login"])).status).toBe(403);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("rejects requests whose origin differs from the configured deployed site", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SITE_URL", "https://app.example.test");
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  expect((await localGateway(request("auth/login", "POST"), ["auth", "login"])).status).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("does not follow upstream redirects or leak unrelated cookies", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, {status: 302, headers: {location: "https://attacker.test"}}))
    .mockResolvedValueOnce(successEnvelope([], {headers: {"content-type": "application/json", "set-cookie": "other=secret; HttpOnly"}}));
  vi.stubGlobal("fetch", fetchMock);
  expect((await localGateway(request("locations/provinces"), ["locations", "provinces"])).status).toBe(502);
  const response = await localGateway(request("locations/provinces"), ["locations", "provinces"]);
  expect(response.headers.get("set-cookie")).toBeNull();
});

it("rejects unexpected cookie policies and preserves Secure on HTTPS localhost", () => {
  expect(localizeRefreshCookie(sessionCookie, true)).toContain("; Secure");
  for (const raw of [sessionCookie.replace("; HttpOnly", ""), sessionCookie.replace("; Secure", ""), sessionCookie + "; Domain=.example.test", sessionCookie.replace("Strict", "None"), sessionCookie.replace("2592000", "999999999"), sessionCookie.replace("/api/v1/auth", "/")]) {
    expect(() => localizeRefreshCookie(raw, false)).toThrow();
  }
});

it("preserves an upstream session cookie without inventing persistence", () => {
  const raw = "ustarotam_refresh=session-token; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict";
  const localized = localizeRefreshCookie(raw, false);
  expect(localized).toBe("usta_rotam_dev_refresh=session-token; Path=/api/local/auth; HttpOnly; SameSite=Strict");
  expect(localized).not.toMatch(/Max-Age|Expires/i);
});

it("rejects oversized/invalid JSON and ambiguous cookies", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  for (const body of ["{invalid", JSON.stringify({data: "a".repeat(17000)})]) {
    expect((await localGateway(request("auth/login", "POST", {body}), ["auth", "login"])).status).toBe(400);
  }
  expect((await localGateway(request("auth/refresh", "POST", {cookie: "usta_rotam_dev_refresh=a; usta_rotam_dev_refresh=b"}), ["auth", "refresh"])).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("rejects unsupported email-change paths instead of inventing a backend contract", async () => {
  const mock = vi.fn();
  vi.stubGlobal("fetch", mock);
  const response = await localGateway(request("auth/email-change/request", "POST", {body: JSON.stringify({email: "new@example.test"}), authorization: "Bearer token"}), ["auth", "email-change", "request"]);
  expect(response.status).toBe(404);
  expect(mock).not.toHaveBeenCalled();
});
