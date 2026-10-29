import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isRetryableStatus,
  kindForStatus,
  parseFailureResponse,
  parseRetryAfter,
  readJsonResponse,
} from "@/lib/api/failure";
import type { ApiError } from "@/lib/api/errors";

function asApiError(error: unknown): ApiError {
  return error as ApiError;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("kindForStatus / isRetryableStatus", () => {
  it("maps statuses to error kinds", () => {
    expect(kindForStatus(400)).toBe("validation");
    expect(kindForStatus(422)).toBe("validation");
    expect(kindForStatus(401)).toBe("auth");
    expect(kindForStatus(403)).toBe("forbidden");
    expect(kindForStatus(404)).toBe("not_found");
    expect(kindForStatus(409)).toBe("conflict");
    expect(kindForStatus(429)).toBe("rate_limit");
    expect(kindForStatus(500)).toBe("server");
    expect(kindForStatus(501)).toBe("server");
    expect(kindForStatus(418)).toBe("unknown");
  });

  it("retries only transient statuses", () => {
    for (const status of [429, 500, 502, 503, 504]) {
      expect(isRetryableStatus(status)).toBe(true);
    }

    for (const status of [400, 401, 403, 404, 409, 422, 501, 505]) {
      expect(isRetryableStatus(status)).toBe(false);
    }
  });
});

describe("parseRetryAfter", () => {
  it("parses seconds", () => {
    expect(parseRetryAfter("2")).toBe(2000);
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter(" 3 ")).toBe(3000);
  });

  it("rejects invalid and negative values", () => {
    expect(parseRetryAfter("1.5")).toBeUndefined();
    expect(parseRetryAfter("-1")).toBeUndefined();
    expect(parseRetryAfter("abc")).toBeUndefined();
    expect(parseRetryAfter("")).toBeUndefined();
    expect(parseRetryAfter("   ")).toBeUndefined();
  });

  it("parses future HTTP dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const header = new Date("2026-01-01T00:00:05.000Z").toUTCString();

    expect(parseRetryAfter(header)).toBe(5000);
  });

  it("rejects past HTTP dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));

    const header = new Date("2026-01-01T00:00:05.000Z").toUTCString();

    expect(parseRetryAfter(header)).toBeUndefined();
  });
});

describe("readJsonResponse", () => {
  it("returns parsed JSON", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
    });

    await expect(readJsonResponse(response, "req-1")).resolves.toEqual({
      ok: true,
    });
  });

  it("classifies malformed JSON as a contract error", async () => {
    const response = new Response("{not-json", { status: 200 });

    const error = await readJsonResponse(response, "req-2").then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(error).not.toBeNull();

    const apiError = asApiError(error);
    expect(apiError.kind).toBe("contract");
    expect(apiError.code).toBe("INVALID_RESPONSE_JSON");
    expect(apiError.retryable).toBe(false);
    expect(apiError.status).toBe(200);
    expect(apiError.requestId).toBe("req-2");
  });

  it("classifies an empty body as a contract error", async () => {
    const response = new Response(null, { status: 200 });

    await expect(
      readJsonResponse(response, "req-3"),
    ).rejects.toMatchObject({
      kind: "contract",
      code: "INVALID_RESPONSE_JSON",
      retryable: false,
    });
  });

  it("does not convert body-read aborts into contract errors", async () => {
    const response = {
      status: 200,
      json: async () => {
        throw new DOMException("Aborted", "AbortError");
      },
    } as unknown as Response;

    await expect(
      readJsonResponse(response, "req-abort"),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("parseFailureResponse", () => {
  it("parses failure envelopes and Retry-After", async () => {
    const response = new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
          details: { retry: true },
        },
      }),
      {
        status: 429,
        headers: { "retry-after": "2" },
      },
    );

    const error = await parseFailureResponse(response, "req-4");

    expect(error.kind).toBe("rate_limit");
    expect(error.status).toBe(429);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.details).toEqual({ retry: true });
    expect(error.retryable).toBe(true);
    expect(error.retryAfterMs).toBe(2000);
  });

  it("uses retryable statuses without Retry-After", async () => {
    const response = new Response(null, { status: 503 });

    const error = await parseFailureResponse(response, "req-5");

    expect(error.kind).toBe("server");
    expect(error.status).toBe(503);
    expect(error.message).toBe("HTTP 503");
    expect(error.retryable).toBe(true);
    expect(error.retryAfterMs).toBeUndefined();
  });

  it("does not retry non-transient 5xx statuses", async () => {
    const response = new Response(null, { status: 501 });

    const error = await parseFailureResponse(response, "req-6");

    expect(error.kind).toBe("server");
    expect(error.retryable).toBe(false);
  });

  it("does not retry 4xx validation failures", async () => {
    const response = new Response(null, { status: 400 });

    const error = await parseFailureResponse(response, "req-7");

    expect(error.kind).toBe("validation");
    expect(error.retryable).toBe(false);
  });

  it("keeps Retry-After only for retryable statuses", async () => {
    const response = new Response(null, {
      status: 400,
      headers: { "retry-after": "10" },
    });

    const error = await parseFailureResponse(response, "req-8");

    expect(error.retryAfterMs).toBeUndefined();
  });
});
