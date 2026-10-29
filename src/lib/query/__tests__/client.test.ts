import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { createQueryClient } from "@/lib/query/client";

const client = createQueryClient();
const queryDefaults = client.getDefaultOptions().queries;

const retry = queryDefaults?.retry as (
  failureCount: number,
  error: unknown,
) => boolean;
const retryDelay = queryDefaults?.retryDelay as (
  attemptIndex: number,
  error: unknown,
) => number;

describe("query retry policy", () => {
  it("does not retry non-retryable ApiErrors", () => {
    const error = new ApiError({ kind: "validation", message: "Invalid" });

    expect(retry(0, error)).toBe(false);
  });

  it("retries retryable ApiErrors", () => {
    const error = new ApiError({ kind: "network", message: "Offline" });

    expect(retry(0, error)).toBe(true);
    expect(retry(1, error)).toBe(true);
    expect(retry(2, error)).toBe(false);
  });

  it("respects a short Retry-After delay", () => {
    const error = new ApiError({
      kind: "rate_limit",
      message: "Slow down",
      retryAfterMs: 1000,
    });

    expect(retry(0, error)).toBe(true);
    expect(retryDelay(0, error)).toBe(1000);
  });

  it("does not retry when Retry-After exceeds the limit", () => {
    const error = new ApiError({
      kind: "rate_limit",
      message: "Slow down",
      retryAfterMs: 30_000,
    });

    expect(retry(0, error)).toBe(false);
  });

  it("uses exponential backoff when Retry-After is absent", () => {
    const error = new ApiError({ kind: "server", message: "Server error" });

    expect(retryDelay(0, error)).toBe(800);
    expect(retryDelay(1, error)).toBe(1600);
    expect(retryDelay(10, error)).toBe(5000);
  });

  it("retries unknown errors until the retry limit", () => {
    const error = new Error("Unknown");

    expect(retry(0, error)).toBe(true);
    expect(retry(1, error)).toBe(true);
    expect(retry(2, error)).toBe(false);
  });
});
