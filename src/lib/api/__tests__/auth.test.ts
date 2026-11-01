import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createFetchMock, failureResponse, jsonResponse, noContentResponse, successEnvelope, TEST_API_BASE_URL } from "./helpers";

const user = { id: "user", email: "user@example.test", firstName: "Test", lastName: "User", emailVerified: true, roles: ["CUSTOMER"] };

it("sends partial name updates and rejects direct email changes", async () => {
  const { fetchMock, calls } = createFetchMock(() => successEnvelope({ ...user, firstName: "Updated" }));
  vi.stubGlobal("fetch", fetchMock);
  const { beginSession, setAccessToken } = await import("../token-store");
  beginSession();
  setAccessToken("access-token");
  const { authService } = await import("../endpoints/auth");
  await authService.updateProfile({ firstName: "Updated" });
  expect(calls).toHaveLength(1);
  expect(calls[0].init.method).toBe("PATCH");
  expect(JSON.parse(String(calls[0].init.body))).toEqual({ firstName: "Updated" });
  // @ts-expect-error Email must never be sent through profile PATCH.
  await expect(authService.updateProfile({ email: "new@example.test" })).rejects.toThrow();
  await expect(authService.updateProfile({})).rejects.toThrow();
  expect(calls).toHaveLength(1);
});

it.each([false, true])("routes the complete localhost auth lifecycle through the gateway with rememberMe=%s", async (rememberMe) => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubGlobal("window", { location: { hostname: "localhost" }, dispatchEvent: vi.fn() });
  const { fetchMock, calls } = createFetchMock((_, index) => {
    if (index === 4) return noContentResponse();
    return successEnvelope(index === 0 ? {user, accessToken: "login-token"} : index === 2 ? {accessToken: "refresh-token"} : user);
  });
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  await authService.login({email: user.email, password: "test-password", rememberMe});
  await authService.refreshSession();
  await authService.logout();
  expect(calls.map(call => call.url)).toEqual(["/api/local/auth/login", "/api/local/auth/me", "/api/local/auth/refresh", "/api/local/auth/me", "/api/local/auth/logout"]);
  expect(calls.every(call => call.init.credentials === "include")).toBe(true);
  expect(JSON.parse(String(calls[0].init.body))).toEqual({email: user.email, password: "test-password", rememberMe});
  const { getAccessToken } = await import("../token-store");
  expect(getAccessToken()).toBeNull();
});
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", TEST_API_BASE_URL);
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("loads the authoritative profile after login and sends only supported headers", async () => {
  const { fetchMock, calls } = createFetchMock((_, index) => successEnvelope(index === 0 ? {user, accessToken: "test-token"} : user));
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  const result = await authService.login({ email: user.email, password: "test-password", rememberMe: true });
  expect(result.user.emailVerified).toBe(true);
  expect(calls.map(call => call.url)).toEqual([`${TEST_API_BASE_URL}/auth/login`, `${TEST_API_BASE_URL}/auth/me`]);
  expect(new Headers(calls[0].init.headers).has("X-Request-Id")).toBe(false);
  expect(new Headers(calls[1].init.headers).get("Authorization")).toBe("Bearer test-token");
  expect(calls[0].init.credentials).toBe("include");
  expect(JSON.parse(String(calls[0].init.body))).toEqual({email: user.email, password: "test-password", rememberMe: true});
});

it("uses roles from /auth/me instead of trusting roles in the login response", async () => {
  const loginUser = { ...user, roles: ["WORKSHOP_OWNER"] };
  const authoritativeUser = { ...user, roles: ["USER"] };
  const { fetchMock } = createFetchMock((_, index) =>
    successEnvelope(index === 0
      ? { user: loginUser, accessToken: "test-token" }
      : authoritativeUser),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  const session = await authService.login({ email: user.email, password: "test-password", rememberMe: false });
  expect(session.user.roles).toEqual(["USER"]);
});

it("validates the Google refresh session with /auth/me before returning the user", async () => {
  const authoritativeUser = { ...user, roles: ["USER"] };
  const { fetchMock, calls } = createFetchMock((_call, index) =>
    successEnvelope(
      index === 0
        ? { user: { ...user, roles: ["ADMIN"] }, accessToken: "google-access" }
        : authoritativeUser,
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  const store = await import("../token-store");

  const result = await authService.completeGoogleLogin();

  expect(result.roles).toEqual(["USER"]);
  expect(calls.map(({ url }) => url)).toEqual([
    `${TEST_API_BASE_URL}/auth/refresh`,
    `${TEST_API_BASE_URL}/auth/me`,
  ]);
  expect(calls[0].init.credentials).toBe("include");
  expect(new Headers(calls[1].init.headers).get("Authorization")).toBe(
    "Bearer google-access",
  );
  expect(store.getAccessToken()).toBe("google-access");
});

it("clears the Google access token and rejects when /auth/me denies the session", async () => {
  const { fetchMock } = createFetchMock((_call, index) =>
    index === 0
      ? successEnvelope({ user, accessToken: "unverified-google-access" })
      : index === 1 || index === 3
        ? failureResponse(401, { code: "INVALID_ACCESS_TOKEN" })
        : successEnvelope({ accessToken: "retry-google-access" }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  const store = await import("../token-store");

  await expect(authService.completeGoogleLogin()).rejects.toMatchObject({
    code: "GOOGLE_OAUTH_SESSION_MISSING",
  });
  expect(store.getAccessToken()).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it.each([[403, "EMAIL_NOT_VERIFIED"], [401, "INVALID_CREDENTIALS"], [429, "AUTH_RATE_LIMITED"], [503, "AUTH_NOT_CONFIGURED"]])("preserves login error %s without refreshing", async (status, code) => {
  const { fetchMock } = createFetchMock(() => failureResponse(status as number, {code: code as string}));
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  await expect(authService.login({email: user.email, password: "wrong", rememberMe: false})).rejects.toMatchObject({code});
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("accepts the resend endpoint's top-level success response", async () => {
  vi.stubGlobal("fetch", createFetchMock(() => jsonResponse({success: true}, {status: 202})).fetchMock);
  const { authService } = await import("../endpoints/auth");
  await expect(authService.resendEmailVerification(user.email)).resolves.toBeUndefined();
});

it("uses the exact password-reset request and confirm contracts", async () => {
  const token = "r".repeat(48);
  const { fetchMock, calls } = createFetchMock((_call, index) =>
    index === 0
      ? jsonResponse({ success: true }, { status: 202 })
      : noContentResponse(),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  await authService.requestPasswordReset(user.email);
  await authService.resetPassword(token, "Reset!Password123");
  expect(calls.map((call) => call.url)).toEqual([
    `${TEST_API_BASE_URL}/auth/password-reset/request`,
    `${TEST_API_BASE_URL}/auth/password-reset/confirm`,
  ]);
  expect(JSON.parse(String(calls[0].init.body))).toEqual({ email: user.email });
  expect(JSON.parse(String(calls[1].init.body))).toEqual({ token, newPassword: "Reset!Password123" });
  expect(calls.every((call) => call.init.method === "POST")).toBe(true);
});

it("does not call an invented email-change endpoint", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  await expect(authService.requestEmailChange("new@example.test")).rejects.toMatchObject({ code: "EMAIL_CHANGE_UNAVAILABLE" });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("calls logout directly without refreshing and clears memory even on network failure", async () => {
  const { authService } = await import("../endpoints/auth");
  const store = await import("../token-store");
  store.setAccessToken("old-token");
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("offline"));
  vi.stubGlobal("fetch", fetchMock);
  await expect(authService.logout()).rejects.toMatchObject({kind: "network"});
  expect(store.getAccessToken()).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("never installs the unverified registration token and revokes the issued session", async () => {
  const store = await import("../token-store");
  const { fetchMock, calls } = createFetchMock((_, index) => {
    expect(store.getAccessToken()).toBeNull();
    return index === 0 ? successEnvelope({user: {...user, emailVerified: false}, accessToken: "unverified"}) : noContentResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  await expect(authService.register({firstName: "Test", lastName: "User", email: user.email, password: "ValidPassword1!", provinceId: "00000000-0000-4000-8000-000000000001", termsAccepted: true, privacyAccepted: true})).resolves.toEqual({sessionCleared: true});
  expect(calls[1].url).toBe(`${TEST_API_BASE_URL}/auth/logout`);
  expect(store.getAccessToken()).toBeNull();
});

const registration = {firstName: "Test", lastName: "User", email: user.email, password: "ValidPassword1!", provinceId: "00000000-0000-4000-8000-000000000001", termsAccepted: true as const, privacyAccepted: true as const};

it("preserves registration failure without logging out or retrying the POST", async () => {
  const { fetchMock } = createFetchMock(() => failureResponse(409, {code: "REGISTRATION_UNAVAILABLE"}));
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  await expect(authService.register(registration)).rejects.toMatchObject({code: "REGISTRATION_UNAVAILABLE"});
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("reports completed registration separately from failed session cleanup", async () => {
  const { fetchMock } = createFetchMock((_, index) => index === 0
    ? successEnvelope({user: {...user, emailVerified: false}, accessToken: "never-installed"})
    : failureResponse(503));
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  await expect(authService.register(registration)).resolves.toEqual({sessionCleared: false});
  const { getAccessToken } = await import("../token-store");
  expect(getAccessToken()).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("confirms an email using POST and accepts the backend's 204", async () => {
  const { fetchMock, calls } = createFetchMock(() => noContentResponse());
  vi.stubGlobal("fetch", fetchMock);
  const { authService } = await import("../endpoints/auth");
  await expect(authService.verifyEmail("test-verification-token".repeat(2))).resolves.toBeUndefined();
  expect(calls[0].url).toBe(`${TEST_API_BASE_URL}/auth/email-verification/confirm`);
  expect(calls[0].init.method).toBe("POST");
  expect(new Headers(calls[0].init.headers).has("Authorization")).toBe(false);
});

it("restores a fresh page session through refresh then me", async () => {
  const { fetchMock, calls } = createFetchMock((_, index) => successEnvelope(index === 0 ? {accessToken: "restored"} : user));
  vi.stubGlobal("fetch", fetchMock);
  const { bootstrapSession } = await import("../endpoints/auth");
  await expect(bootstrapSession()).resolves.toMatchObject({email: user.email});
  expect(calls.map(call => call.url)).toEqual([`${TEST_API_BASE_URL}/auth/refresh`, `${TEST_API_BASE_URL}/auth/me`]);
  expect(new Headers(calls[1].init.headers).get("Authorization")).toBe("Bearer restored");
});

it("does not load me or retry when a fresh page has an expired refresh cookie", async () => {
  const { fetchMock } = createFetchMock(() => failureResponse(401, {code: "INVALID_REFRESH_TOKEN"}));
  vi.stubGlobal("fetch", fetchMock);
  const { bootstrapSession } = await import("../endpoints/auth");
  await expect(bootstrapSession()).resolves.toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("queues login behind an in-flight restore so refresh cannot overwrite its access token", async () => {
  const { promise, resolve } = Promise.withResolvers<Response>();
  const { fetchMock, calls } = createFetchMock(async (call) => {
    if (call.url.endsWith("/auth/refresh")) return promise;
    if (call.url.endsWith("/auth/login")) return successEnvelope({user, accessToken: "login-token"});
    return successEnvelope(user);
  });
  vi.stubGlobal("fetch", fetchMock);
  const { authService, bootstrapSession } = await import("../endpoints/auth");
  const restoring = bootstrapSession();
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  const loggingIn = authService.login({email: user.email, password: "ValidPassword1!", rememberMe: false});
  await Promise.resolve();
  expect(calls).toHaveLength(1);
  resolve(successEnvelope({accessToken: "restore-token"}));
  await Promise.all([restoring, loggingIn]);
  const { getAccessToken } = await import("../token-store");
  expect(getAccessToken()).toBe("login-token");
});

it("broadcasts only a logout signal to other tabs", async () => {
  const postMessage = vi.fn(); const close = vi.fn();
  class Channel {
    constructor(name: string) { expect(name).toBe("usta-rotam-auth"); }
    postMessage = postMessage;
    close = close;
  }
  vi.stubGlobal("window", {BroadcastChannel: Channel});
  vi.stubGlobal("fetch", createFetchMock(() => noContentResponse()).fetchMock);
  const { authService } = await import("../endpoints/auth");
  await authService.logout();
  expect(postMessage).toHaveBeenCalledExactlyOnceWith("logout");
  expect(close).toHaveBeenCalledTimes(1);
});
