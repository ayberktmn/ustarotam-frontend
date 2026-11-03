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
      bannerUrl: `/api/v1/workshops/${id}/banner`,
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

test("customer badges use API counts in desktop and mobile menus", async ({ page, context }, testInfo) => {
  await page.addInitScript(({ key, ids }) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, ids }));
  }, {
    key: `usta-rotam.favorites.v1.${mockUser.id}`,
    ids: [workshopId, secondWorkshopId],
  });
  await context.route("**/api/local/messages/unread-count", (route) =>
    route.fulfill({ json: { success: true, data: { count: 4 } } }),
  );
  await context.route("**/api/local/work-requests/mine*", (route) =>
    route.fulfill({ json: { success: true, data: [{
      id: "40000000-0000-4000-8000-000000000001",
      vehicleType: { id: "car", name: "Otomobil", slug: "otomobil" },
      vehicleBrand: null,
      vehicleModel: null,
      specialty: { id: "brake", name: "Fren", slug: "fren", description: null },
      province: { id: "ankara", name: "Ankara", slug: "ankara", code: 6 },
      district: { id: "cankaya", name: "Çankaya", slug: "cankaya" },
      address: "Çankaya",
      description: "Fren bakımı",
      status: "PUBLISHED",
      assignedWorkshopId: null,
      photoCount: 0,
      createdAt: "2026-11-03T10:00:00.000Z",
      updatedAt: "2026-11-03T10:00:00.000Z",
    }], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } } }),
  );
  await context.route("**/api/local/reviews/mine*", (route) =>
    route.fulfill({ json: { success: true, data: [], meta: { page: 1, limit: 1, total: 3, totalPages: 3 } } }),
  );

  await page.goto("/hesabim");
  const accountNav = page.getByRole("navigation", { name: "Hesap menüsü" });
  await expect(accountNav.getByRole("link", { name: /Mesajlar 4/ })).toBeVisible();
  await expect(accountNav.getByRole("link", { name: /Taleplerim 1/ })).toBeVisible();
  await expect(accountNav.getByRole("link", { name: /Favorilerim 2/ })).toBeVisible();
  await expect(accountNav.getByRole("link", { name: /Yorumlarım 3/ })).toBeVisible();

  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Menüyü aç" }).click();
    const mobileMenu = page.locator("#mobile-menu");
    await expect(mobileMenu.getByRole("link", { name: /Mesajlar 4/ })).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: /Taleplerim 1/ })).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: /Favorilerim 2/ })).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: /Yorumlarım 3/ })).toBeVisible();
  }
});

test("customer message send renders the response and client navigation stays healthy", async ({ page, context }, testInfo) => {
  const conversationId = `${mockUser.id}:${workshopId}`;
  const messages: Array<{
    id: string;
    body: string;
    sender: string;
    createdAt: string;
    readAt: string | null;
  }> = [{
    id: "message-1",
    body: "Ustadan ilk mesaj",
    sender: "WORKSHOP",
    createdAt: "2026-11-03T10:00:00.000Z",
    readAt: "2026-11-03T10:01:00.000Z",
  }];
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await context.route("**/api/local/messages/unread-count", (route) =>
    route.fulfill({ json: { success: true, data: { count: 0 } } }),
  );
  await context.route("**/api/local/work-requests/mine*", (route) =>
    route.fulfill({ json: { success: true, data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } } }),
  );
  await context.route("**/api/local/reviews/mine*", (route) =>
    route.fulfill({ json: { success: true, data: [], meta: { page: 1, limit: 1, total: 0, totalPages: 0 } } }),
  );
  await context.route("**/api/local/conversations?*", (route) =>
    route.fulfill({ json: { success: true, data: [{
      id: conversationId,
      requestId: mockUser.id,
      customerName: "Örnek Servis",
      requestTitle: "Fren bakımı",
      lastMessage: messages.at(-1)?.body ?? "",
      lastMessageAt: messages.at(-1)?.createdAt ?? null,
      unreadCount: 0,
    }], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } } }),
  );
  await context.route("**/api/local/conversations/**", async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path.endsWith("/messages") && route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { body: string };
      const sent = { id: "message-2", body: body.body, sender: "CUSTOMER", createdAt: "2026-11-03T10:02:00.000Z", readAt: null };
      messages.push(sent);
      return route.fulfill({ status: 201, json: { success: true, data: sent } });
    }
    if (path.endsWith("/messages")) {
      return route.fulfill({ json: { success: true, data: messages, meta: { page: 1, limit: 100, total: messages.length, totalPages: 1 } } });
    }
    return route.fulfill({ json: { success: true, data: {
      id: conversationId,
      requestId: mockUser.id,
      customerName: "Örnek Servis",
      requestTitle: "Fren bakımı",
      lastMessage: messages.at(-1)?.body ?? "",
      lastMessageAt: messages.at(-1)?.createdAt ?? null,
      unreadCount: 0,
    } } });
  });

  await page.goto("/hesabim/mesajlar");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /Örnek Servis/ }).click();
  }
  await page.getByRole("textbox", { name: "Mesajınızı yazın" }).fill("Müşteri yanıtı");
  await page.getByRole("button", { name: "Gönder" }).click();
  await expect(page.getByText("Müşteri yanıtı", { exact: true }).last()).toBeVisible();
  await page.getByRole("navigation", { name: "Hesap menüsü" }).getByRole("link", { name: "Favorilerim" }).click();
  await expect(page).toHaveURL(/\/hesabim\/favoriler$/);
  await page.getByRole("navigation", { name: "Hesap menüsü" }).getByRole("link", { name: "Mesajlar" }).click();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /Örnek Servis/ }).click();
  }
  await expect(page.getByText("Müşteri yanıtı", { exact: true }).last()).toBeVisible();
  expect(runtimeErrors).toEqual([]);
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
  const banner = page.locator("main article img").first();
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute("src", new RegExp(`/api/local/workshops/${workshopId}/banner(?:\\?|$)`));
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
    if (url.searchParams.get("limit") === "100") requestedPages.push(pageNumber);
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
