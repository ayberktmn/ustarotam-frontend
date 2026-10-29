import { expect, test } from "@playwright/test";

import { mockAuth, mockUser } from "./auth-fixture";

const workshopId = "10000000-0000-4000-8000-000000000001";
const secondWorkshopId = "10000000-0000-4000-8000-000000000002";
const missingWorkshopId = "10000000-0000-4000-8000-000000000003";

function workshop(id: string, name: string, slug = `usta-${id.slice(-1)}`) {
  return {
    success: true,
    data: {
      id,
      slug,
      name,
      province: { id: "20000000-0000-4000-8000-000000000001", name: "Ankara" },
      district: { id: "20000000-0000-4000-8000-000000000002", name: "Çankaya" },
      specialties: [],
      vehicleTypes: [],
      averageRating: 4.5,
      reviewCount: 2,
      verificationStatus: "VERIFIED",
    },
  };
}

function review(id: string, businessId: string, moderationStatus: "PUBLISHED" | "PENDING") {
  return {
    id,
    workshopId: businessId,
    overallRating: 5,
    comment: `Review ${id.slice(-1)}`,
    createdAt: "2026-10-20T10:00:00.000Z",
    serviceDescription: "Periodic maintenance",
    serviceDate: "2026-10-19T00:00:00.000Z",
    resolutionStatus: "YES",
    verificationStatus: "VERIFIED",
    moderationStatus,
    withdrawnAt: null,
    ownerReply: {
      reply: "Thank you for your feedback.",
      createdAt: "2026-10-21T10:00:00.000Z",
      updatedAt: "2026-10-21T10:00:00.000Z",
    },
    author: { firstName: mockUser.firstName, lastName: mockUser.lastName },
    specialtyRatings: [],
  };
}

test.beforeEach(async ({ context }) => {
  await mockAuth(context);
  await context.addCookies([{
    name: "usta_rotam_dev_refresh",
    value: "mock-session",
    domain: "localhost",
    path: "/api/local/auth",
    httpOnly: true,
  }]);
});

test("favorites resolve all saved workshop IDs and stay in sync after reload and removal", async ({ page, context }) => {
  await page.addInitScript(({ key, ids }) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, ids }));
  }, {
    key: `usta-rotam.favorites.v1.${mockUser.id}`,
    ids: [workshopId],
  });
  await context.route(`**/api/local/workshops/${workshopId}`, (route) =>
    route.fulfill({
      json: workshop(workshopId, "Kayıtlı Usta", "deneme-ddbf0562"),
    }),
  );

  await page.goto("/hesabim/favoriler");
  await expect(page.getByRole("link", { name: "Kayıtlı Usta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profili incele" })).toHaveAttribute(
    "href",
    "/usta/deneme-ddbf0562",
  );
  await page.reload();
  await expect(page.getByRole("link", { name: "Kayıtlı Usta" })).toBeVisible();

  await page.getByRole("button", { name: "Kayıtlı Usta ustasını favorilerden çıkar" }).click();
  await expect(page.getByText("Henüz favori ustanız yok")).toBeVisible();
  await expect(page.getByText("1 favori usta")).toHaveCount(0);
});

test("unavailable favorites remain removable", async ({ page, context }) => {
  await page.addInitScript(({ key, ids }) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, ids }));
  }, {
    key: `usta-rotam.favorites.v1.${mockUser.id}`,
    ids: [missingWorkshopId],
  });
  await context.route(`**/api/local/workshops/${missingWorkshopId}`, (route) =>
    route.fulfill({
      status: 404,
      json: { success: false, error: { code: "WORKSHOP_NOT_FOUND", message: "Not found" } },
    }),
  );

  await page.goto("/hesabim/favoriler");
  await expect(page.getByText("Bu usta artık görüntülenemiyor.")).toBeVisible();
  await page.getByRole("button", { name: "Favorilerden çıkar" }).click();
  await expect(page.getByText("Henüz favori ustanız yok")).toBeVisible();
});

test("review history follows pagination and shows moderation and business replies", async ({ page, context }) => {
  const requestedPages: string[] = [];
  await context.route("**/api/local/reviews/mine*", (route) => {
    const url = new URL(route.request().url());
    const pageNumber = url.searchParams.get("page") ?? "1";
    requestedPages.push(pageNumber);
    const data = pageNumber === "1"
      ? [review("30000000-0000-4000-8000-000000000001", workshopId, "PUBLISHED")]
      : [review("30000000-0000-4000-8000-000000000002", secondWorkshopId, "PENDING")];
    return route.fulfill({
      json: { success: true, data, meta: { page: Number(pageNumber), limit: 100, total: 101, totalPages: 2 } },
    });
  });
  await context.route(`**/api/local/workshops/${workshopId}`, (route) =>
    route.fulfill({ json: workshop(workshopId, "Birinci Usta") }),
  );
  await context.route(`**/api/local/workshops/${secondWorkshopId}`, (route) =>
    route.fulfill({ json: workshop(secondWorkshopId, "İkinci Usta") }),
  );

  await page.goto("/hesabim/yorumlar");
  await expect(page.getByText("Yayında", { exact: true })).toBeVisible();
  await expect(page.getByText("İncelemede", { exact: true })).toBeVisible();
  await expect(page.getByText("Thank you for your feedback.", { exact: true })).toHaveCount(2);
  expect(requestedPages).toEqual(["1", "2"]);
});

test("review history asks the user to sign in again after a 401", async ({ page, context }) => {
  await context.route("**/api/local/reviews/mine*", (route) =>
    route.fulfill({
      status: 401,
      json: { success: false, error: { code: "AUTHENTICATION_REQUIRED", message: "Unauthorized" } },
    }),
  );

  await page.goto("/hesabim/yorumlar");
  await expect(page).toHaveURL(/\/giris\?returnUrl=.*hesabim/);
  await expect(page.getByRole("heading", { name: "Tekrar hoş geldiniz" })).toBeVisible();
  await expect(page.getByText("Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.", { exact: true })).toBeVisible();
});
