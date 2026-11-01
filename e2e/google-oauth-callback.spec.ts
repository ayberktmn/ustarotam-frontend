import { expect, test } from "@playwright/test";

import { mockUser } from "./auth-fixture";

test("OAuth error returns to localized login with a helpful message", async ({
  page,
}) => {
  await page.route("**/auth/refresh", (route) =>
    route.fulfill({
      status: 401,
      json: {
        success: false,
        error: {
          code: "REFRESH_TOKEN_MISSING",
          message: "Refresh token missing",
        },
      },
    }),
  );

  await page.goto("/oauth/google/callback?status=error&code=GOOGLE_OAUTH_FAILED");

  await expect(page).toHaveURL(/\/giris$/);
  await expect(
    page.getByText(
      "Google OAuth hizmeti şu anda kullanılamıyor olabilir; daha sonra tekrar deneyin.",
    ),
  ).toBeVisible();
});

test("OAuth success refreshes the session and redirects to the home page", async ({
  page,
}) => {
  let refreshCalls = 0;
  const refreshPaths: string[] = [];
  const authMePaths: string[] = [];
  let authMeCalls = 0;
  let refreshIncludedCookieAfterReload = false;
  let authMeIncludedBearerToken = false;
  await page.route("**/api/local/auth/refresh", async (route) => {
    refreshCalls += 1;
    refreshPaths.push(new URL(route.request().url()).pathname);
    if (refreshCalls > 1) {
      refreshIncludedCookieAfterReload =
        route.request().headers().cookie?.includes(
          "usta_rotam_dev_refresh=google-session",
        ) ?? false;
    }
    await route.fulfill({
      headers: {
        "set-cookie":
          "usta_rotam_dev_refresh=google-session; Path=/api/local/auth; HttpOnly; SameSite=Strict; Max-Age=3600",
      },
      json: {
        success: true,
        data: { user: mockUser, accessToken: "mock.google.access.token" },
      },
    });
  });
  await page.route("**/api/local/auth/me", async (route) => {
    authMeCalls += 1;
    authMePaths.push(new URL(route.request().url()).pathname);
    authMeIncludedBearerToken =
      route.request().headers().authorization ===
      "Bearer mock.google.access.token";
    await route.fulfill({ json: { success: true, data: mockUser } });
  });

  await page.goto("/oauth/google/callback?status=success");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('a[href="/hesabim"], a[href="/en/account"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('a[href="/hesabim"], a[href="/en/account"]')).toBeVisible();
  expect(refreshCalls).toBeGreaterThanOrEqual(2);
  expect(authMeCalls).toBeGreaterThanOrEqual(2);
  expect(refreshPaths.every((path) => path === "/api/local/auth/refresh")).toBe(true);
  expect(authMePaths.every((path) => path === "/api/local/auth/me")).toBe(true);
  expect(refreshIncludedCookieAfterReload).toBe(true);
  expect(authMeIncludedBearerToken).toBe(true);
});

test("OAuth refresh alone does not authenticate when /auth/me rejects the access token", async ({
  page,
}) => {
  await page.route("**/api/local/auth/refresh", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { user: mockUser, accessToken: "rejected.google.access.token" },
      },
    }),
  );
  await page.route("**/api/local/auth/me", (route) =>
    route.fulfill({
      status: 401,
      json: {
        success: false,
        error: { code: "INVALID_ACCESS_TOKEN", message: "Invalid token" },
      },
    }),
  );

  await page.goto("/oauth/google/callback?status=success");

  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole("button", { name: "Giriş Yap", exact: true })).toBeVisible();
});
