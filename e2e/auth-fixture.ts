import { expect, type BrowserContext, type Page, type Route } from "@playwright/test";
import provinces from "./fixtures/provinces.json";

export interface AuthMock {
  calls: Array<{ path: string; method: string; body: Record<string, unknown> | null }>;
  loginCode: string | null;
  registerCode: string | null;
  verifyCode: string | null;
  resetCode: string | null;
  provincesFail: boolean;
  specialtiesFail: boolean;
  logoutFail: boolean;
  refreshExpired: boolean;
  roles: string[];
}
export const mockUser = { id: "00000000-0000-4000-8000-000000000001", email: "browser-test@example.test", firstName: "Test", lastName: "User", emailVerified: true, roles: ["USER"] };
export const specialtyCatalog = [
  {id: "00000000-0000-4000-8000-000000000101", name: "Fren Sistemi", slug: "fren-yuruyen"},
  {id: "00000000-0000-4000-8000-000000000102", name: "Motor Mekaniği", slug: "motor-mekanigi"},
];
const cookie = (persistent: boolean) => `usta_rotam_dev_refresh=mock-session; Path=/api/local/auth; HttpOnly; SameSite=Strict${persistent ? "; Max-Age=2592000" : ""}`;

// Every API call is intercepted. No production auth request is allowed in browser tests.
export async function mockAuth(context: BrowserContext): Promise<AuthMock> {
  const state: AuthMock = { calls: [], loginCode: null, registerCode: null, verifyCode: null, resetCode: null, provincesFail: false, specialtiesFail: false, logoutFail: false, refreshExpired: false, roles: ["USER"] };
  await context.route(/^https?:\/\/(?!localhost(?::\d+)?(?:\/|$))/, route => route.abort());
  await context.route("**/api/local/**", async (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/local", "");
    const body = req.postData() ? req.postDataJSON() as Record<string, unknown> : null;
    state.calls.push({path, method: req.method(), body});
    const error = async (status: number, code: string) => route.fulfill({ status, json: {success: false, error: {code, message: "Mock test failure"}} });
    const session = async (verified = true, persistent = true) => route.fulfill({ status: 200, headers: {"set-cookie": cookie(persistent)}, json: {success: true, data: {user: {...mockUser, emailVerified: verified, roles: state.roles}, accessToken: "mock.access.token"}} });
    if (path === "/locations/provinces") {
      if (state.provincesFail) return error(503, "SERVICE_UNAVAILABLE");
      return route.fulfill({json: provinces});
    }
    if (path === "/specialties") {
      if (state.specialtiesFail) return error(503, "SERVICE_UNAVAILABLE");
      return route.fulfill({json: {success: true, data: specialtyCatalog}});
    }
    if (path === "/auth/login") {
      if (state.loginCode) return error(state.loginCode === "EMAIL_NOT_VERIFIED" ? 403 : 401, state.loginCode);
      return session(true, body?.rememberMe === true);
    }
    if (path === "/auth/register") {
      if (state.registerCode) return error(state.registerCode === "EMAIL_DELIVERY_FAILED" ? 503 : 409, state.registerCode);
      return session(false, false);
    }
    if (path === "/auth/refresh") {
      if (state.refreshExpired || !req.headers().cookie?.includes("usta_rotam_dev_refresh=mock-session")) return error(401, "INVALID_REFRESH_TOKEN");
      return session();
    }
    if (path === "/auth/me") {
      if (req.headers().authorization !== "Bearer mock.access.token") return error(401, "AUTHENTICATION_REQUIRED");
      return route.fulfill({json: {success: true, data: {...mockUser, roles: state.roles}}});
    }
    if (path === "/auth/logout") {
      if (state.logoutFail) return error(503, "SERVICE_UNAVAILABLE");
      return route.fulfill({status: 204, headers: {"set-cookie": "usta_rotam_dev_refresh=; Path=/api/local/auth; HttpOnly; SameSite=Strict; Max-Age=0"}});
    }
    if (path === "/auth/email-verification/resend") return route.fulfill({status: 202, json: {success: true}});
    if (path === "/auth/email-verification/confirm") {
      if (state.verifyCode) return error(400, state.verifyCode);
      return route.fulfill({status: 204});
    }
    if (path === "/auth/password-reset/request") return route.fulfill({status: 202, json: {success: true}});
    if (path === "/auth/password-reset/confirm") {
      if (state.resetCode) return error(400, state.resetCode);
      return route.fulfill({status: 204});
    }
    if (path === "/messages/unread-count") return route.fulfill({json: {success: true, data: {count: 0}}});
    if (path === "/work-requests/mine") return route.fulfill({json: {success: true, data: [], meta: {page: 1, limit: 100, total: 0, totalPages: 0}}});
    if (path === "/reviews/mine") return route.fulfill({json: {success: true, data: [], meta: {page: 1, limit: 1, total: 0, totalPages: 0}}});
    if (/^\/workshops\/[0-9a-f-]{36}\/logo$/i.test(path)) return route.fulfill({status: 404, json: {success: false, error: {code: "LOGO_NOT_FOUND", message: "Logo not found"}}});
    if (/^\/workshops\/[0-9a-f-]{36}\/banner$/i.test(path)) return route.fulfill({status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+X8x1WQAAAABJRU5ErkJggg==", "base64")});
    throw new Error(`Unmocked API request: ${req.method()} ${path}`);
  });
  return state;
}

export async function fillRegistration(page: Page): Promise<void> {
  await page.locator("#register-first-name").fill("Test");
  await page.locator("#register-last-name").fill("User");
  await page.locator("#register-email").fill(mockUser.email);
  await page.locator("#register-password").fill("ValidPassword1!");
  await page.locator("#register-confirm").fill("ValidPassword1!");
  await page.locator('input[name="terms"]').check();
  await page.locator("#register-province").click();
  await page.getByRole("option", {name: "Ankara", exact: true}).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

export { provinces };
