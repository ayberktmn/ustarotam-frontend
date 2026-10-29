import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("API base URL configuration", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("uses the gateway on %s with a production bundle and live API configured", async (hostname) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api/v1");
    vi.stubGlobal("window", { location: { hostname } });
    const { getBrowserApiBaseUrl } = await import("../config");
    expect(getBrowserApiBaseUrl()).toBe("/api/local");
  });

  it.each(["app.example.test", "localhost.attacker.test"])("uses the configured live API on %s", async (hostname) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api/v1/");
    vi.stubGlobal("window", { location: { hostname } });
    const { getBrowserApiBaseUrl } = await import("../config");
    expect(getBrowserApiBaseUrl()).toBe("https://api.example.test/api/v1");
  });

  it("never falls back to localhost in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");

    const { getBrowserApiBaseUrl } = await import(
      "@/lib/api/config"
    );

    expect(() => getBrowserApiBaseUrl()).toThrow("must be configured");
  });

  it("uses the same-origin development gateway", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubGlobal("window", { location: { hostname: "localhost" } });

    const { getBrowserApiBaseUrl } = await import(
      "@/lib/api/config"
    );

    expect(getBrowserApiBaseUrl()).toBe("/api/local");
  });

  it("keeps server-only configuration out of browser requests", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api/v1/");
    vi.stubEnv("API_INTERNAL_BASE_URL", "http://127.0.0.1:4300/api/v1/");
    const { getBrowserApiBaseUrl, getServerApiBaseUrl } = await import("../config");
    expect(getBrowserApiBaseUrl()).toBe("https://api.example.test/api/v1");
    expect(getServerApiBaseUrl()).toBe("http://127.0.0.1:4300/api/v1");
  });

  it.each([
    "http://api.example.test/api/v1", "https://user:password@api.example.test/api/v1",
    "https://api.example.test/api/v1?token=secret", "https://api.example.test/api/v1#fragment",
  ])("rejects unsafe API configuration: %s", async (baseUrl) => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", baseUrl);
    const { getBrowserApiBaseUrl } = await import("../config");
    expect(() => getBrowserApiBaseUrl()).toThrow();
  });
});
