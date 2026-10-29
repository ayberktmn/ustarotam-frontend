import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveRetryDelay, sleepWithSignal } from "@/lib/api/retry";
import type { ApiError } from "@/lib/api/errors";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("resolveRetryDelay", () => {
  it("uses the exact server delay when it is within the limit", () => {
    expect(resolveRetryDelay(0, 1500)).toBe(1500);
    expect(resolveRetryDelay(3, 0)).toBe(0);
  });

  it("returns null when the server delay exceeds the limit", () => {
    expect(resolveRetryDelay(0, 10_000)).toBeNull();
  });

  it("falls back to exponential backoff with jitter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(resolveRetryDelay(0)).toBe(500);
    expect(resolveRetryDelay(1)).toBe(1000);
    expect(resolveRetryDelay(4)).toBe(5000);
  });

  it("caps jittered backoff at the maximum delay", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    expect(resolveRetryDelay(10)).toBe(5000);
  });

  it("falls back when Retry-After is negative or not finite", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(resolveRetryDelay(0, -1)).toBe(500);
    expect(resolveRetryDelay(0, Number.NaN)).toBe(500);
    expect(resolveRetryDelay(0, Number.POSITIVE_INFINITY)).toBe(500);
  });
});

describe("sleepWithSignal", () => {
  it("resolves after the delay", async () => {
    vi.useFakeTimers();

    const promise = sleepWithSignal(1000, undefined, "req-sleep");

    await vi.advanceTimersByTimeAsync(999);
    let settled = false;
    void promise.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects immediately for an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const error: ApiError = await sleepWithSignal(
      1000,
      controller.signal,
      "req-aborted",
    ).then(
      () => {
        throw new Error("Expected cancellation");
      },
      (reason: ApiError) => reason,
    );

    expect(error.code).toBe("REQUEST_CANCELLED");
    expect(error.retryable).toBe(false);
    expect(error.requestId).toBe("req-aborted");
  });

  it("rejects when aborted during the delay", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();

    const promise = sleepWithSignal(
      5000,
      controller.signal,
      "req-mid-abort",
    );

    await vi.advanceTimersByTimeAsync(100);
    controller.abort();

    await expect(promise).rejects.toMatchObject({
      code: "REQUEST_CANCELLED",
      retryable: false,
    });

    await vi.advanceTimersByTimeAsync(5000);
  });
});
