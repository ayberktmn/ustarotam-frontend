import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_API_TIMEOUT_MS } from "@/lib/api/config";
import {
  abortableFetch,
  createFetchMock,
  failureResponse,
  successEnvelope,
  TEST_API_BASE_URL,
} from "@/lib/api/__tests__/helpers";

async function loadRefreshModule() {
  const refresh = await import("@/lib/api/token-refresh");
  const store = await import("@/lib/api/token-store");

  return { ...refresh, ...store };
}

beforeEach(() => {
  vi.resetModules();
  vi.useRealTimers();
  process.env.NEXT_PUBLIC_API_BASE_URL = TEST_API_BASE_URL;
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("refreshAccessToken", () => {
  it("rejects undocumented token aliases instead of inventing a session contract", async () => {
    const { refreshAccessToken, getAccessToken } = await loadRefreshModule();
    vi.stubGlobal("fetch", createFetchMock(() => successEnvelope({ token: "legacy-token" })).fetchMock);
    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "unavailable", error: { code: "MISSING_ACCESS_TOKEN" },
    });
    expect(getAccessToken()).toBeNull();
  });

  it("stores the new token when refresh succeeds", async () => {
    const { refreshAccessToken, setAccessToken, getAccessToken } =
      await loadRefreshModule();
    setAccessToken("old-token");

    const { fetchMock } = createFetchMock(() =>
      successEnvelope({ accessToken: "new-token" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(refreshAccessToken()).resolves.toEqual({
      status: "refreshed",
    });
    expect(getAccessToken()).toBe("new-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${TEST_API_BASE_URL}/auth/refresh`,
    );
  });

  it("marks a 401 refresh response as expired and clears the token", async () => {
    const { refreshAccessToken, setAccessToken, getAccessToken } =
      await loadRefreshModule();
    setAccessToken("old-token");

    vi.stubGlobal(
      "fetch",
      createFetchMock(() =>
        failureResponse(401, { code: "INVALID_REFRESH_TOKEN" }),
      ).fetchMock,
    );

    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "expired",
      error: { status: 401, kind: "auth" },
    });
    expect(getAccessToken()).toBeNull();
  });

  it("treats a refresh-token code on a 400 as expired", async () => {
    const { refreshAccessToken, setAccessToken, getAccessToken } =
      await loadRefreshModule();
    setAccessToken("old-token");

    vi.stubGlobal(
      "fetch",
      createFetchMock(() =>
        failureResponse(400, { code: "INVALID_REFRESH_TOKEN" }),
      ).fetchMock,
    );

    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "expired",
    });
    expect(getAccessToken()).toBeNull();
  });

  it("does not clear the token or expire the session on a 500", async () => {
    const { refreshAccessToken, setAccessToken, getAccessToken } =
      await loadRefreshModule();
    setAccessToken("old-token");

    vi.stubGlobal(
      "fetch",
      createFetchMock(() => failureResponse(500)).fetchMock,
    );

    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "unavailable",
      error: { kind: "server", status: 500 },
    });
    expect(getAccessToken()).toBe("old-token");
  });

  it("does not clear the token on a network failure", async () => {
    const { refreshAccessToken, setAccessToken, getAccessToken } =
      await loadRefreshModule();
    setAccessToken("old-token");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Network down");
      }),
    );

    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "unavailable",
      error: { kind: "network" },
    });
    expect(getAccessToken()).toBe("old-token");
  });

  it("classifies malformed refresh JSON as unavailable", async () => {
    const { refreshAccessToken, setAccessToken, getAccessToken } =
      await loadRefreshModule();
    setAccessToken("old-token");

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("{not-json", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "unavailable",
      error: { kind: "contract", code: "INVALID_RESPONSE_JSON" },
    });
    expect(getAccessToken()).toBe("old-token");
  });

  it("classifies a missing access token as unavailable", async () => {
    const { refreshAccessToken, setAccessToken, getAccessToken } =
      await loadRefreshModule();
    setAccessToken("old-token");

    vi.stubGlobal(
      "fetch",
      createFetchMock(() => successEnvelope({})).fetchMock,
    );

    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "unavailable",
      error: { kind: "contract", code: "MISSING_ACCESS_TOKEN" },
    });
    expect(getAccessToken()).toBe("old-token");
  });

  it("times out deterministically", async () => {
    vi.useFakeTimers();
    const { refreshAccessToken, setAccessToken, getAccessToken } =
      await loadRefreshModule();
    setAccessToken("old-token");

    const { fetchMock } = abortableFetch();
    vi.stubGlobal("fetch", fetchMock);

    const promise = refreshAccessToken();
    await vi.advanceTimersByTimeAsync(DEFAULT_API_TIMEOUT_MS);

    await expect(promise).resolves.toMatchObject({
      status: "unavailable",
      error: { kind: "timeout", retryable: true },
    });
    expect(getAccessToken()).toBe("old-token");
  });

  it("preserves Retry-After metadata on 429", async () => {
    const { refreshAccessToken } = await loadRefreshModule();

    vi.stubGlobal(
      "fetch",
      createFetchMock(() =>
        failureResponse(429, {
          headers: { "retry-after": "3" },
        }),
      ).fetchMock,
    );

    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "unavailable",
      error: {
        kind: "rate_limit",
        retryable: true,
        retryAfterMs: 3000,
      },
    });
  });

  it("performs a single refresh for concurrent callers", async () => {
    const { refreshAccessToken } = await loadRefreshModule();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const fetchMock = vi.fn(async () => {
      await gate;
      return successEnvelope({ accessToken: "new-token" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = refreshAccessToken();
    const second = refreshAccessToken();

    release?.();

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: "refreshed" },
      { status: "refreshed" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns unavailable outside the browser", async () => {
    const { refreshAccessToken } = await loadRefreshModule();
    vi.unstubAllGlobals();

    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "unavailable",
      error: { retryable: false },
    });
  });

  it("never rejects on unexpected failures", async () => {
    const { refreshAccessToken } = await loadRefreshModule();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw "unexpected";
      }),
    );

    await expect(refreshAccessToken()).resolves.toMatchObject({
      status: "unavailable",
    });
  });
});
