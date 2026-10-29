import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { ApiError } from "@/lib/api/errors";
import {
  abortableFetch,
  createFetchMock,
  failureResponse,
  header,
  invalidJsonResponse,
  jsonResponse,
  noContentResponse,
  stubBrowserWindow,
  successEnvelope,
  TEST_API_BASE_URL,
} from "@/lib/api/__tests__/helpers";

const payloadSchema = z.object({ ok: z.boolean() });
const payload = { ok: true };

let dispatchEvent: ReturnType<typeof vi.fn>;

async function loadApi() {
  const client = await import("@/lib/api/client");
  const store = await import("@/lib/api/token-store");

  return { ...client, ...store };
}

async function captureError(
  promise: Promise<unknown>,
): Promise<ApiError> {
  return promise.then(
    () => {
      throw new Error("Expected promise to reject");
    },
    (reason: unknown) => reason as ApiError,
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.useRealTimers();
  process.env.NEXT_PUBLIC_API_BASE_URL = TEST_API_BASE_URL;
  process.env.API_INTERNAL_BASE_URL = TEST_API_BASE_URL;
  dispatchEvent = stubBrowserWindow().dispatchEvent;
});

afterEach(() => {
  vi.doUnmock("@/lib/api/token-refresh");
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("authentication modes", () => {
  it("defaults to optional: attaches a token and refreshes on 401", async () => {
    const api = await loadApi();
    api.setAccessToken("old-token");

    const { fetchMock, calls } = createFetchMock((call, index) => {
      if (index === 0) {
        expect(header(call, "authorization")).toBe("Bearer old-token");
        return failureResponse(401, { code: "INVALID_ACCESS_TOKEN" });
      }

      if (index === 1) {
        expect(call.url).toBe(`${TEST_API_BASE_URL}/auth/refresh`);
        return successEnvelope({ accessToken: "new-token" });
      }

      expect(header(call, "authorization")).toBe("Bearer new-token");
      return successEnvelope(payload);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api.browserRequest({ path: "/workshops", schema: payloadSchema }),
    ).resolves.toEqual(payload);

    expect(calls).toHaveLength(3);
    expect(api.getAccessToken()).toBe("new-token");
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("attaches tokens in optional and required modes", async () => {
    for (const auth of ["optional", "required"] as const) {
      vi.resetModules();
      const api = await loadApi();
      api.setAccessToken("token");

      const { fetchMock, calls } = createFetchMock(() =>
        successEnvelope(payload),
      );
      vi.stubGlobal("fetch", fetchMock);

      await api.browserRequest({
        path: "/private",
        schema: payloadSchema,
        auth,
      });

      expect(header(calls[0], "authorization")).toBe("Bearer token");
    }
  });

  it("does not attach a token or refresh in none mode", async () => {
    const api = await loadApi();
    api.setAccessToken("token");

    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.browserRequest({
      path: "/public",
      schema: payloadSchema,
      auth: "none",
    });

    expect(calls).toHaveLength(1);
    expect(header(calls[0], "authorization")).toBeNull();
    expect(calls[0].init.credentials).toBe("include");
  });

  it("preserves caller Authorization headers in none mode", async () => {
    const api = await loadApi();
    api.setAccessToken("auto-token");

    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.browserRequest({
      path: "/public",
      schema: payloadSchema,
      auth: "none",
      headers: { Authorization: "Bearer caller-token" },
    });

    expect(header(calls[0], "authorization")).toBe("Bearer caller-token");
  });

  it("does not refresh or emit expiration for none mode 401", async () => {
    const api = await loadApi();

    const { fetchMock, calls } = createFetchMock(() =>
      failureResponse(401, { code: "AUTHENTICATION_REQUIRED" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/public",
        schema: payloadSchema,
        auth: "none",
      }),
    );

    expect(error.status).toBe(401);
    expect(calls).toHaveLength(1);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("sends optional requests anonymously when no token exists", async () => {
    const api = await loadApi();

    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.browserRequest({
      path: "/public",
      schema: payloadSchema,
      auth: "optional",
    });

    expect(calls).toHaveLength(1);
    expect(header(calls[0], "authorization")).toBeNull();
  });
});

describe("required authentication without an access token", () => {
  it("refreshes before sending the request", async () => {
    const api = await loadApi();

    const { fetchMock, calls } = createFetchMock((call, index) => {
      if (index === 0) {
        expect(call.url).toBe(`${TEST_API_BASE_URL}/auth/refresh`);
        return successEnvelope({ accessToken: "new-token" });
      }

      expect(header(call, "authorization")).toBe("Bearer new-token");
      return successEnvelope(payload);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api.browserRequest({
        path: "/private",
        schema: payloadSchema,
        auth: "required",
      }),
    ).resolves.toEqual(payload);

    expect(calls).toHaveLength(2);
    expect(api.getAccessToken()).toBe("new-token");
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("emits session expiration when refresh is definitively expired", async () => {
    const api = await loadApi();

    const { fetchMock, calls } = createFetchMock(() =>
      failureResponse(401, { code: "INVALID_REFRESH_TOKEN" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/private",
        schema: payloadSchema,
        auth: "required",
      }),
    );

    expect(error.code).toBe("SESSION_EXPIRED");
    expect(error.retryable).toBe(false);
    expect(calls).toHaveLength(1);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it("surfaces transient refresh failures without expiring the session", async () => {
    const api = await loadApi();

    const { fetchMock, calls } = createFetchMock(() => {
      throw new TypeError("Network down");
    });
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/private",
        schema: payloadSchema,
        auth: "required",
      }),
    );

    expect(error.kind).toBe("network");
    expect(calls).toHaveLength(1);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});

describe("401 refresh flows", () => {
  it("reuses a completed refresh for a delayed old-token 401", async () => {
    const api = await loadApi();
    api.setAccessToken("old-token");
    let release!: (response: Response) => void;
    const delayed = new Promise<Response>((resolve) => { release = resolve; });
    let refreshCount = 0;
    const { fetchMock } = createFetchMock((call) => {
      if (call.url.endsWith("/auth/refresh")) {
        refreshCount += 1;
        return successEnvelope({ accessToken: "new-token" });
      }
      if (header(call, "authorization") === "Bearer new-token") return successEnvelope(payload);
      if (call.url.endsWith("/slow")) return delayed;
      return failureResponse(401, { code: "INVALID_ACCESS_TOKEN" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const slow = api.browserRequest({ path: "/slow", schema: payloadSchema, auth: "required" });
    await api.browserRequest({ path: "/fast", schema: payloadSchema, auth: "required" });
    release(failureResponse(401, { code: "INVALID_ACCESS_TOKEN" }));
    await expect(slow).resolves.toEqual(payload);
    expect(refreshCount).toBe(1);
  });

  it("does not emit expiration for optional requests", async () => {
    const api = await loadApi();
    api.setAccessToken("old-token");

    const { fetchMock } = createFetchMock((_call, index) => {
      if (index === 0) {
        return failureResponse(401, { code: "INVALID_ACCESS_TOKEN" });
      }

      return failureResponse(401, { code: "INVALID_REFRESH_TOKEN" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/optional",
        schema: payloadSchema,
        auth: "optional",
      }),
    );

    expect(error.status).toBe(401);
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(api.getAccessToken()).toBeNull();
  });

  it("emits expiration once for required requests", async () => {
    const api = await loadApi();
    api.setAccessToken("old-token");

    const { fetchMock } = createFetchMock((_call, index) => {
      if (index === 0) {
        return failureResponse(401, { code: "INVALID_ACCESS_TOKEN" });
      }

      return failureResponse(401, { code: "INVALID_REFRESH_TOKEN" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/required",
        schema: payloadSchema,
        auth: "required",
      }),
    );

    expect(error.code).toBe("SESSION_EXPIRED");
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it("does not emit expiration when refresh is temporarily unavailable", async () => {
    const api = await loadApi();
    api.setAccessToken("old-token");

    const { fetchMock } = createFetchMock((_call, index) => {
      if (index === 0) {
        return failureResponse(401, { code: "INVALID_ACCESS_TOKEN" });
      }

      return failureResponse(500);
    });
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/required",
        schema: payloadSchema,
        auth: "required",
      }),
    );

    expect(error.kind).toBe("server");
    expect(error.status).toBe(500);
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(api.getAccessToken()).toBe("old-token");
  });

  it("does not refresh twice after a repeated 401", async () => {
    const api = await loadApi();
    api.setAccessToken("old-token");

    const { fetchMock, calls } = createFetchMock((_call, index) => {
      if (index === 0) {
        return failureResponse(401, { code: "INVALID_ACCESS_TOKEN" });
      }

      if (index === 1) {
        return successEnvelope({ accessToken: "new-token" });
      }

      return failureResponse(401, { code: "INVALID_ACCESS_TOKEN" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/required",
        schema: payloadSchema,
        auth: "required",
      }),
    );

    expect(error.code).toBe("SESSION_EXPIRED");
    expect(calls).toHaveLength(3);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(api.getAccessToken()).toBeNull();
  });

  it("normalizes an unexpected refresh rejection without expiring the session", async () => {
    vi.doMock("@/lib/api/token-refresh", () => ({
      refreshAccessToken: vi.fn(async () => {
        throw new Error("Refresh exploded");
      }),
    }));

    const api = await loadApi();
    api.setAccessToken("old-token");

    const { fetchMock } = createFetchMock(() =>
      failureResponse(401, { code: "INVALID_ACCESS_TOKEN" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/required",
        schema: payloadSchema,
        auth: "required",
      }),
    );

    expect(error.kind).toBe("unknown");
    expect(error.retryable).toBe(false);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("clears the token without emitting for repeated optional 401s", async () => {
    const api = await loadApi();
    api.setAccessToken("old-token");

    const { fetchMock, calls } = createFetchMock((_call, index) => {
      if (index === 0) {
        return failureResponse(401, { code: "INVALID_ACCESS_TOKEN" });
      }

      if (index === 1) {
        return successEnvelope({ accessToken: "new-token" });
      }

      return failureResponse(401, { code: "INVALID_ACCESS_TOKEN" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/optional",
        schema: payloadSchema,
        auth: "optional",
      }),
    );

    expect(error.status).toBe(401);
    expect(calls).toHaveLength(3);
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(api.getAccessToken()).toBeNull();
  });
});

describe("response body contracts", () => {
  it("classifies malformed JSON as contract without retrying", async () => {
    const api = await loadApi();
    const { fetchMock, calls } = createFetchMock(() =>
      invalidJsonResponse(200),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({ path: "/bad-json", schema: payloadSchema }),
    );

    expect(error.kind).toBe("contract");
    expect(error.code).toBe("INVALID_RESPONSE_JSON");
    expect(error.retryable).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("classifies an empty 200 body as contract", async () => {
    const api = await loadApi();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );

    const error = await captureError(
      api.browserRequest({ path: "/empty", schema: payloadSchema }),
    );

    expect(error.kind).toBe("contract");
    expect(error.code).toBe("INVALID_RESPONSE_JSON");
  });

  it("classifies invalid schema data as contract", async () => {
    const api = await loadApi();
    vi.stubGlobal(
      "fetch",
      createFetchMock(() => successEnvelope({ ok: "yes" })).fetchMock,
    );

    const error = await captureError(
      api.browserRequest({ path: "/schema", schema: payloadSchema }),
    );

    expect(error.kind).toBe("contract");
    expect(error.retryable).toBe(false);
    expect(error.requestId).toBeTruthy();
  });

  it("does not expose the raw response in envelope errors", async () => {
    const api = await loadApi();
    vi.stubGlobal(
      "fetch",
      createFetchMock(() =>
        jsonResponse({ secret: "do-not-leak" }),
      ).fetchMock,
    );

    const error = await captureError(
      api.browserRequest({ path: "/envelope", schema: payloadSchema }),
    );

    expect(error.kind).toBe("contract");
    expect(JSON.stringify(error.details)).not.toContain("do-not-leak");
  });

  it("returns undefined for 204 with a void schema", async () => {
    const api = await loadApi();
    vi.stubGlobal(
      "fetch",
      createFetchMock(() => noContentResponse()).fetchMock,
    );

    await expect(
      api.browserRequest({ path: "/no-content", schema: z.void() }),
    ).resolves.toBeUndefined();
  });

  it("rejects 204 when the schema expects data", async () => {
    const api = await loadApi();
    vi.stubGlobal(
      "fetch",
      createFetchMock(() => noContentResponse()).fetchMock,
    );

    const error = await captureError(
      api.browserRequest({ path: "/no-content", schema: payloadSchema }),
    );

    expect(error.kind).toBe("contract");
    expect(error.status).toBe(204);
  });
});

describe("retry policy", () => {
  it("waits for the exact numeric Retry-After", async () => {
    vi.useFakeTimers();
    const api = await loadApi();

    const { fetchMock, calls } = createFetchMock((_call, index) => {
      if (index === 0) {
        return failureResponse(429, {
          headers: { "retry-after": "2" },
        });
      }

      return successEnvelope(payload);
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = api.browserRequest({
      path: "/rate-limited",
      schema: payloadSchema,
    });

    await vi.advanceTimersByTimeAsync(1999);
    expect(calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);

    await expect(promise).resolves.toEqual(payload);
    expect(calls).toHaveLength(2);
  });

  it("does not retry before a server delay beyond the limit", async () => {
    const api = await loadApi();
    const { fetchMock, calls } = createFetchMock(() =>
      failureResponse(429, {
        headers: { "retry-after": "120" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({ path: "/rate-limited", schema: payloadSchema }),
    );

    expect(error.kind).toBe("rate_limit");
    expect(error.retryAfterMs).toBe(120_000);
    expect(calls).toHaveLength(1);
  });

  it("falls back to backoff for an invalid Retry-After", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const api = await loadApi();

    const { fetchMock, calls } = createFetchMock((_call, index) => {
      if (index === 0) {
        return failureResponse(429, {
          headers: { "retry-after": "invalid" },
        });
      }

      return successEnvelope(payload);
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = api.browserRequest({
      path: "/rate-limited",
      schema: payloadSchema,
    });

    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toEqual(payload);
    expect(calls).toHaveLength(2);
  });

  it("retries transient 5xx responses", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const api = await loadApi();

    const { fetchMock, calls } = createFetchMock((_call, index) =>
      index === 0 ? failureResponse(500) : successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = api.browserRequest({
      path: "/server-error",
      schema: payloadSchema,
    });

    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toEqual(payload);
    expect(calls).toHaveLength(2);
  });

  it("does not retry 501", async () => {
    const api = await loadApi();
    const { fetchMock, calls } = createFetchMock(() =>
      failureResponse(501),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({ path: "/not-implemented", schema: payloadSchema }),
    );

    expect(error.kind).toBe("server");
    expect(error.retryable).toBe(false);
    expect(calls).toHaveLength(1);
  });
});

describe("cancellation and timeouts", () => {
  it("does not call fetch for a pre-aborted signal", async () => {
    const api = await loadApi();
    const controller = new AbortController();
    controller.abort();

    const { fetchMock } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      api.browserRequest({
        path: "/cancelled",
        schema: payloadSchema,
        signal: controller.signal,
      }),
    );

    expect(error.code).toBe("REQUEST_CANCELLED");
    expect(error.retryable).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not retry after cancellation during the request", async () => {
    const api = await loadApi();
    const controller = new AbortController();
    const { fetchMock, calls } = abortableFetch();
    vi.stubGlobal("fetch", fetchMock);

    const promise = api.browserRequest({
      path: "/slow",
      schema: payloadSchema,
      signal: controller.signal,
    });

    controller.abort();

    const error = await captureError(promise);

    expect(error.code).toBe("REQUEST_CANCELLED");
    expect(error.retryable).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("interrupts backoff when cancelled", async () => {
    vi.useFakeTimers();
    const api = await loadApi();
    const controller = new AbortController();

    const { fetchMock, calls } = createFetchMock(() =>
      failureResponse(503, {
        headers: { "retry-after": "1" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = api.browserRequest({
      path: "/backoff",
      schema: payloadSchema,
      signal: controller.signal,
    });

    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    const error = await captureError(promise);

    expect(error.code).toBe("REQUEST_CANCELLED");
    expect(calls).toHaveLength(1);
  });

  it("classifies timeouts separately from cancellation", async () => {
    vi.useFakeTimers();
    const api = await loadApi();
    const { fetchMock, calls } = abortableFetch();
    vi.stubGlobal("fetch", fetchMock);

    const promise = captureError(
      api.browserRequest({
        path: "/timeout",
        schema: payloadSchema,
        timeoutMs: 1000,
        retries: 0,
      }),
    );

    await vi.advanceTimersByTimeAsync(1000);

    const error = await promise;

    expect(error.kind).toBe("timeout");
    expect(error.retryable).toBe(true);
    expect(calls).toHaveLength(1);
  });
});

describe("request body and cache semantics", () => {
  it("serializes JSON bodies with the JSON content type", async () => {
    const api = await loadApi();
    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.browserRequest({
      path: "/create",
      method: "POST",
      body: { name: "Test" },
      schema: payloadSchema,
    });

    expect(calls[0].init.body).toBe(JSON.stringify({ name: "Test" }));
    expect(header(calls[0], "content-type")).toBe("application/json");
  });

  it("does not send a body on GET requests", async () => {
    const api = await loadApi();
    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.browserRequest({
      path: "/get",
      body: { ignored: true },
      schema: payloadSchema,
    });

    expect(calls[0].init.body).toBeUndefined();
    expect(header(calls[0], "content-type")).toBeNull();
  });

  it("classifies JSON serialization failures as contract errors", async () => {
    const api = await loadApi();
    const { fetchMock } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const error = await captureError(
      api.browserRequest({
        path: "/create",
        method: "POST",
        body: circular,
        schema: payloadSchema,
      }),
    );

    expect(error.kind).toBe("contract");
    expect(error.code).toBe("REQUEST_BODY_SERIALIZATION_FAILED");
    expect(error.retryable).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("applies next options only on the server", async () => {
    const api = await loadApi();
    const next = { revalidate: 60, tags: ["catalog"] };

    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.serverRequest({
      path: "/catalog",
      schema: payloadSchema,
      next,
    });

    expect(calls[0].init.next).toEqual(next);
    expect(calls[0].init.credentials).toBe("same-origin");
  });

  it("does not apply next options in the browser", async () => {
    const api = await loadApi();
    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.browserRequest({
      path: "/catalog",
      schema: payloadSchema,
      next: { revalidate: 60, tags: ["catalog"] },
    });

    expect(calls[0].init.next).toBeUndefined();
    expect(calls[0].init.cache).toBe("no-store");
  });

  it("does not cache non-GET browser requests", async () => {
    const api = await loadApi();
    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.browserRequest({
      path: "/create",
      method: "POST",
      body: { ok: true },
      schema: payloadSchema,
    });

    expect(calls[0].init.cache).toBe("no-store");
  });

  it("preserves explicit browser cache options", async () => {
    const api = await loadApi();
    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.browserRequest({
      path: "/catalog",
      schema: payloadSchema,
      cache: "force-cache",
    });

    expect(calls[0].init.cache).toBe("force-cache");
  });

  it("allows a credentials override", async () => {
    const api = await loadApi();
    const { fetchMock, calls } = createFetchMock(() =>
      successEnvelope(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.browserRequest({
      path: "/public",
      schema: payloadSchema,
      auth: "none",
      credentials: "omit",
    });

    expect(calls[0].init.credentials).toBe("omit");
  });
});
