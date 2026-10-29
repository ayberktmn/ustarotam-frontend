import { afterEach, expect, it, vi } from "vitest";
import { getApiHealth, getServerApiHealth } from "../endpoints/health";
import { createFetchMock, header, jsonResponse, TEST_API_BASE_URL } from "./helpers";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("accepts the live health contract without a data envelope or timestamp", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", TEST_API_BASE_URL);
  vi.stubEnv("API_INTERNAL_BASE_URL", TEST_API_BASE_URL);
  const payload = { success: true, service: "ustarotam-api", status: "ok" };
  const { fetchMock, calls } = createFetchMock(() => jsonResponse(payload));
  vi.stubGlobal("fetch", fetchMock);
  await expect(getApiHealth()).resolves.toEqual(payload);
  await expect(getServerApiHealth()).resolves.toEqual(payload);
  expect(calls.every(call => call.url === `${TEST_API_BASE_URL}/health`)).toBe(true);
  expect(calls.every(call => header(call, "authorization") === null)).toBe(true);
});
