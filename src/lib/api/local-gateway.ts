import { DOCX_MIME, MAX_DOCUMENT_BYTES, PDF_MIME, documentTypes } from "@/lib/workshop-application";

// Node-only gateway, restricted to the configured site origin.
const LOCAL_COOKIE = "usta_rotam_dev_refresh";
const UPSTREAM_COOKIE = "ustarotam_refresh";
const COOKIE_PATH = "/api/local/auth";
const MAX_BODY_BYTES = 16_384;
const MAX_COOKIE_AGE = 90 * 86_400;
const applicationId = "[a-zA-Z0-9_-]{1,128}";
const workRequestId = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}";
const documentUploadPath = new RegExp(`^workshop-applications/${applicationId}/documents/(${documentTypes.join("|")})$`);
const applicationDocumentsPath = new RegExp(`^workshop-applications/${applicationId}/documents$`);
const applicationDocumentReadPath = new RegExp(`^workshop-applications/${applicationId}/documents/${applicationId}$`);
const workRequestPath = new RegExp(`^work-requests(?:/mine|/${workRequestId})?$`);
const workRequestCancelPath = new RegExp(`^work-requests/${workRequestId}/cancel$`);
const workRequestDetailPath = new RegExp(`^work-requests/${workRequestId}$`);
const documentMimeTypes = new Set([PDF_MIME, DOCX_MIME]);
const protectedListPath = /^(reviews\/mine|work-offers\/(matching|mine)|conversations|notifications)$/;

class UploadBodyError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

async function readDocumentBody(request: Request): Promise<ArrayBuffer> {
  if (!documentMimeTypes.has(request.headers.get("content-type") ?? "")) throw new UploadBodyError(415, "INVALID_DOCUMENT_TYPE");
  if (!request.body) throw new UploadBodyError(400, "EMPTY_DOCUMENT");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_DOCUMENT_BYTES) {
      await reader.cancel();
      throw new UploadBodyError(413, "DOCUMENT_TOO_LARGE");
    }
    chunks.push(value);
  }
  if (!length) throw new UploadBodyError(400, "EMPTY_DOCUMENT");
  return new Uint8Array(Buffer.concat(chunks)).buffer;
}

function failure(status: number, code: string): Response {
  return Response.json({ success: false, error: { code, message: "API gateway request failed." } },
    { status, headers: { "Cache-Control": "no-store" } });
}

function allowedPath(path: string, method: string): boolean {
  if (method === "POST" && (path === "work-requests" || workRequestCancelPath.test(path) || path === "workshop-applications" || path === "workshop-applications/drafts" || /^workshop-applications\/[a-zA-Z0-9_-]{1,128}\/submit$/.test(path) || documentUploadPath.test(path))) return true;
  if (method === "GET" && (path === "workshop-applications/mine" || applicationDocumentsPath.test(path) || applicationDocumentReadPath.test(path))) return true;
  if (method === "PATCH") return path === "auth/me" || workRequestDetailPath.test(path) || /^workshops\/[a-zA-Z0-9-]+$/.test(path) || /^workshop-applications\/[a-zA-Z0-9_-]{1,128}$/.test(path);
  if (method === "POST") return /^auth\/(login|register|refresh|logout|email-verification\/(resend|confirm)|password-reset\/(request|confirm))$/.test(path);
  if (method !== "GET") return false;
  return path === "health" || path === "auth/me" || workRequestPath.test(path) || /^(locations\/provinces|specialties|vehicles\/(types|brands|models)|workshops)$/.test(path) ||
    protectedListPath.test(path) ||
    /^workshops\/mine(?:\/profile|\/reviews)?$/.test(path) ||
    /^locations\/(provinces\/[a-zA-Z0-9-]+\/districts|districts\/[a-zA-Z0-9-]+\/industrial-sites)$/.test(path) ||
    /^workshops\/[a-zA-Z0-9-]+(?:\/reviews)?$/.test(path);
}

function trustedUpstream(): URL {
  const target = new URL(process.env.API_INTERNAL_BASE_URL ?? "");
  const publicTarget = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
  if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash ||
      target.pathname.replace(/\/$/, "") !== "/api/v1" ||
      target.origin !== publicTarget.origin || target.pathname.replace(/\/$/, "") !== publicTarget.pathname.replace(/\/$/, "")) {
    throw new Error("Invalid gateway target configuration");
  }
  return target;
}

function refreshCookie(request: Request): string | null {
  const values = (request.headers.get("cookie") ?? "").split(";").map(value => value.trim())
    .filter(value => value.startsWith(`${LOCAL_COOKIE}=`));
  if (!values.length) return null;
  if (values.length !== 1) throw new Error("Ambiguous cookie");
  const value = values[0].slice(LOCAL_COOKIE.length + 1);
  // A just-cleared cookie may still reach an already-started request as an
  // empty value. Treat it as absent so logout races cannot become a 400.
  if (!value) return null;
  if (!/^[A-Za-z0-9_.%~-]{1,2048}$/.test(value)) throw new Error("Invalid cookie");
  return `${UPSTREAM_COOKIE}=${value}`;
}

function setCookieValues(headers: Headers): string[] {
  const enhanced = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof enhanced.getSetCookie === "function") return enhanced.getSetCookie();
  const value = headers.get("set-cookie");
  // This gateway accepts exactly one named auth cookie. A combined header is
  // rejected instead of attempting unsafe comma splitting around Expires.
  return value ? [value] : [];
}

export function localizeRefreshCookie(raw: string, secure: boolean): string {
  const [pair, ...parts] = raw.split(";").map(part => part.trim());
  if (!pair.startsWith(`${UPSTREAM_COOKIE}=`)) throw new Error("Unexpected upstream cookie");
  const value = pair.slice(UPSTREAM_COOKIE.length + 1);
  if (value && !/^[A-Za-z0-9_.%~-]{1,2048}$/.test(value)) throw new Error("Invalid upstream cookie");
  const attributes = new Map<string, string>();
  for (const part of parts) {
    const index = part.indexOf("=");
    const key = (index < 0 ? part : part.slice(0, index)).toLowerCase();
    if (attributes.has(key)) throw new Error("Duplicate cookie attribute");
    attributes.set(key, index < 0 ? "" : part.slice(index + 1));
  }
  if (!attributes.has("httponly") || !attributes.has("secure") || attributes.get("samesite")?.toLowerCase() !== "strict" ||
      attributes.get("path") !== "/api/v1/auth" || attributes.has("domain")) throw new Error("Unexpected cookie policy");
  const age = attributes.get("max-age");
  const expires = attributes.get("expires");
  const expiry = expires ? Date.parse(expires) : NaN;
  if (age !== undefined && (!/^-?\d+$/.test(age) || Number(age) > MAX_COOKIE_AGE)) throw new Error("Invalid cookie lifetime");
  if (expires && !Number.isFinite(expiry)) throw new Error("Invalid cookie expiry");
  if (age === undefined && expiry > Date.now() + MAX_COOKIE_AGE * 1000) throw new Error("Invalid cookie expiry");
  return `${LOCAL_COOKIE}=${value}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}${age !== undefined ? `; Max-Age=${age}` : ""}${expires ? `; Expires=${new Date(expiry).toUTCString()}` : ""}`;
}

async function readBody(request: Request): Promise<string | undefined> {
  if (request.method === "GET") return undefined;
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("Body too large"); }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  // Next.js may expose an empty POST as a non-null stream. Refresh and logout
  // intentionally have no JSON body, so only require a content type when bytes exist.
  if (!body) return undefined;
  if (!request.headers.get("content-type")?.match(/^application\/json(?:;|$)/i)) throw new Error("JSON required");
  if (body) JSON.parse(body);
  return body;
}

export async function localGateway(request: Request, segments: string[]): Promise<Response> {
  let site: URL;
  let target: URL;
  try { site = new URL(process.env.SITE_URL ?? ""); target = trustedUpstream(); }
  catch { return failure(503, "GATEWAY_NOT_CONFIGURED"); }
  const incoming = new URL(request.url);
  if (incoming.origin !== site.origin ||
      request.headers.get("host") !== site.host) return failure(403, "FORBIDDEN");
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") ||
      (origin && origin !== site.origin) || (request.method !== "GET" && origin !== site.origin)) {
    return failure(403, "FORBIDDEN");
  }
  if (segments.some(segment => !/^[a-zA-Z0-9_-]+$/.test(segment))) return failure(404, "NOT_FOUND");
  const path = segments.join("/");
  if (!allowedPath(path, request.method)) return failure(404, "NOT_FOUND");
  const isDocumentUpload = request.method === "POST" && documentUploadPath.test(path);
  let body: string | ArrayBuffer | undefined;
  let cookie: string | null;
  try { body = isDocumentUpload ? await readDocumentBody(request) : await readBody(request); cookie = refreshCookie(request); }
  catch (error) {
    if (error instanceof UploadBodyError) return failure(error.status, error.code);
    return failure(400, "VALIDATION_ERROR");
  }
  // HttpOnly cookies are intentionally invisible to browser JavaScript. Stop
  // empty session probes here before they reach the production auth service.
  if (path === "auth/refresh" && !cookie) return failure(401, "REFRESH_TOKEN_MISSING");
  if (path === "auth/logout" && !cookie) return new Response(null, {status: 204, headers: {"Cache-Control": "no-store"}});
  const headers = new Headers({ Accept: "application/json" });
  if (body) headers.set("Content-Type", isDocumentUpload ? request.headers.get("content-type")! : "application/json");
  if (cookie && ["auth/refresh", "auth/logout"].includes(path)) headers.set("Cookie", cookie);
  const protectedListAuthorization = request.headers.get("authorization");
  if (protectedListPath.test(path) &&
      protectedListAuthorization?.match(/^Bearer [^\s]+$/i)) {
    headers.set("Authorization", protectedListAuthorization);
  }
  const authorization = request.headers.get("authorization");
  if ((workRequestPath.test(path) || workRequestCancelPath.test(path) || path === "auth/me" || path === "workshop-applications" || path.startsWith("workshop-applications/") || path.startsWith("workshops/mine") || /^workshops\/[a-zA-Z0-9-]+$/.test(path)) && authorization?.match(/^Bearer [A-Za-z0-9_.-]+$/)) headers.set("Authorization", authorization);
  // Construct path from validated segments, never from a caller-supplied URL.
  const url = `${target.origin}/api/v1/${path}${incoming.search}`;
  try {
    const timeoutSignal = AbortSignal.timeout(isDocumentUpload ? 120_000 : 10_000);
    const upstreamSignal = AbortSignal.any([request.signal, timeoutSignal]);
    const upstream = await fetch(url, { method: request.method, headers, body, cache: "no-store",
      redirect: "manual", signal: upstreamSignal });
    if (upstream.status >= 300 && upstream.status < 400) return failure(502, "GATEWAY_REDIRECT_REJECTED");
    const responseHeaders = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of ["retry-after", "ratelimit", "ratelimit-policy"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const isDocumentRead = applicationDocumentReadPath.test(path);
    const contentType = upstream.headers.get("content-type");
    if (contentType?.includes("application/json")) responseHeaders.set("Content-Type", "application/json");
    else if (isDocumentRead && contentType && ["application/pdf", DOCX_MIME].includes(contentType)) {
      responseHeaders.set("Content-Type", contentType);
      responseHeaders.set("Content-Disposition", "attachment");
    }
    else if (upstream.status !== 204) return failure(502, "GATEWAY_INVALID_RESPONSE");
    // Error responses are authoritative and must not be replaced by a cookie
    // parsing failure. Auth cookies are only meaningful on successful flows.
    if (!upstream.ok) {
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    }
    const cookies = setCookieValues(upstream.headers);
    const expectedCookies = cookies.filter(value => value.startsWith(`${UPSTREAM_COOKIE}=`));
    if (expectedCookies.length > 1) throw new Error("Ambiguous upstream cookie");
    if (upstream.ok && ["auth/login", "auth/register", "auth/refresh"].includes(path) && expectedCookies.length !== 1) {
      throw new Error("Missing upstream session cookie");
    }
    if (expectedCookies.length) {
      if (!["auth/login", "auth/register", "auth/refresh", "auth/logout"].includes(path)) throw new Error("Unexpected cookie endpoint");
      responseHeaders.append("Set-Cookie", localizeRefreshCookie(expectedCookies[0], site.protocol === "https:"));
    }
    // No upstream CORS, Location, arbitrary cookies or server headers cross this boundary.
    return new Response(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch { return failure(502, "GATEWAY_UNAVAILABLE"); }
}
