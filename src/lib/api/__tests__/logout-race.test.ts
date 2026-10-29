import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { failureResponse, noContentResponse, successEnvelope, TEST_API_BASE_URL } from "./helpers";

const user = { id: "user", email: "user@example.test", firstName: "Test", lastName: "User", emailVerified: true, roles: ["CUSTOMER"] };
const input = { email: user.email, password: "ValidPassword1!", rememberMe: true };

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", TEST_API_BASE_URL);
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each(["success", "validation error"])("discards a late login %s after logout without logging in again", async (result) => {
  const pending = deferredResponse();
  const fetchMock = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(noContentResponse());
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  const store = await import("../token-store");
  const login = authService.login(input);
  const cancelled = expect(login).rejects.toMatchObject({code: "REQUEST_CANCELLED"});
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  const logout = authService.logout();
  expect(store.getAccessToken()).toBeNull();
  pending.resolve(result === "success" ? successEnvelope({user, accessToken: "late-token"}) : failureResponse(400, {code: "VALIDATION_ERROR"}));
  await cancelled;
  await logout;
  expect(fetchMock.mock.calls.map(call => call[0])).toEqual([`${TEST_API_BASE_URL}/auth/login`, `${TEST_API_BASE_URL}/auth/logout`]);
  expect(store.getAccessToken()).toBeNull();
  await expect(authService.refreshSession()).resolves.toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("does not refresh or emit session errors for a late profile 401 after logout", async () => {
  const pending = deferredResponse();
  const fetchMock = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(noContentResponse());
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  const store = await import("../token-store");
  store.setAccessToken("access");
  const profile = authService.me();
  const cancelled = expect(profile).rejects.toMatchObject({code: "REQUEST_CANCELLED"});
  await authService.logout();
  pending.resolve(failureResponse(401, {code: "INVALID_ACCESS_TOKEN"}));
  await cancelled;
  expect(fetchMock.mock.calls.map(call => call[0])).toEqual([`${TEST_API_BASE_URL}/auth/me`, `${TEST_API_BASE_URL}/auth/logout`]);
  expect(window.dispatchEvent).not.toHaveBeenCalled();
  expect(store.getAccessToken()).toBeNull();
});

it("discards an in-flight refresh token and still revokes the cookie on logout", async () => {
  const pending = deferredResponse();
  const fetchMock = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(noContentResponse());
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  const { refreshAccessToken } = await import("../token-refresh");
  const store = await import("../token-store");
  const refresh = refreshAccessToken();
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  const logout = authService.logout();
  pending.resolve(successEnvelope({accessToken: "late-refresh-token"}));
  await expect(refresh).resolves.toMatchObject({status: "unavailable", error: {code: "REQUEST_CANCELLED"}});
  await logout;
  expect(fetchMock.mock.calls[1][0]).toBe(`${TEST_API_BASE_URL}/auth/logout`);
  expect(fetchMock.mock.calls[1][1].credentials).toBe("include");
  expect(store.getAccessToken()).toBeNull();
  await expect(authService.refreshSession()).resolves.toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("allows a deliberate new login after logout with the original rememberMe contract", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(noContentResponse())
    .mockResolvedValueOnce(successEnvelope({user, accessToken: "new-token"}))
    .mockResolvedValueOnce(successEnvelope(user));
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  await authService.logout();
  await expect(authService.login(input)).resolves.toMatchObject({user, accessToken: "new-token"});
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(input);
});
