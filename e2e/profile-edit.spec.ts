import { expect, test } from "@playwright/test";
import { mockAuth, mockUser } from "./auth-fixture";

test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ context }) => {
  await mockAuth(context);
  await context.addCookies([{ name: "usta_rotam_dev_refresh", value: "mock-session", domain: "localhost", path: "/api/local/auth", httpOnly: true }]);
  await context.route("**/api/local/workshop-applications/mine*", route => route.fulfill({
    json: {success: true, data: [], meta: {page: 1, limit: 100, total: 0, totalPages: 0}},
  }));
});

function workshopApplication(status: "DRAFT" | "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED", rejectionReason: string | null = null) {
  return {
    success: true,
    data: [{
      id: "00000000-0000-4000-8000-000000000100",
      status,
      name: "Test Servis",
      businessType: "SAHIS",
      phone: "05551234567",
      address: "Test adresi",
      province: {id: "00000000-0000-4000-8000-000000000101", name: "Ankara"},
      district: {id: "00000000-0000-4000-8000-000000000102", name: "Çankaya"},
      vehicleTypes: [],
      brands: [],
      specialties: [],
      rejectionReason,
    }],
    meta: {page: 1, limit: 100, total: 1, totalPages: 1},
  };
}

test("rejected workshop application card shows the backend reason and remains editable", async ({ page }) => {
  const rejectionReason = `Ruhsat belgesinin okunabilir bir kopyasını yükleyin. ${"Eksik belge açıklaması ".repeat(8)}`;
  await page.route("**/api/local/workshop-applications/mine*", route => route.fulfill({json: workshopApplication("REJECTED", rejectionReason)}));
  await page.goto("/hesabim/profil");
  const card = page.getByRole("link", {name: /Usta başvurusu/});
  await expect(card).toHaveAttribute("href", "/usta-ol");
  await expect(card).toHaveClass(/border-red-200/);
  await expect(card.locator("span").first()).toHaveClass(/bg-red-100/);
  await expect(card.getByText("Reddedildi", {exact: true})).toHaveClass(/text-red-700/);
  await expect(card.getByText("Red nedeni", {exact: true})).toBeVisible();
  await expect(card.getByText(rejectionReason, {exact: true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

for (const [status, label, border, icon] of [
  ["VERIFIED", "Onaylandı", "border-emerald-200", "bg-emerald-100"],
  ["PENDING", "İnceleme bekliyor", "border-amber-200", "bg-amber-100"],
  ["DRAFT", "Taslak", "border-line", "bg-muted"],
  ["SUSPENDED", "Askıya alındı", "border-orange-200", "bg-orange-100"],
] as const) {
  test(`${status} workshop application card uses its status treatment without a rejection reason`, async ({ page }) => {
    await page.route("**/api/local/workshop-applications/mine*", route => route.fulfill({json: workshopApplication(status, "Eski bir admin notu")}));
    await page.goto("/hesabim/profil");
    const card = page.getByRole("link", {name: /Usta başvurusu/});
    await expect(card).toHaveAttribute("href", "/usta-ol");
    await expect(card).toHaveClass(new RegExp(border));
    await expect(card.locator("span").first()).toHaveClass(new RegExp(icon));
    await expect(card.getByText(label, {exact: true})).toBeVisible();
    await expect(card.getByText("Red nedeni", {exact: true})).toHaveCount(0);
  });
}

test("profile saves only allowed fields, blocks duplicate saves and displays the API response", async ({ page, context }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const bodies: unknown[] = [];
  await context.route("**/api/local/auth/me", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    bodies.push(route.request().postDataJSON());
    await gate;
    await route.fulfill({ json: { success: true, data: { ...mockUser, firstName: "API Name", lastName: "Updated", phone: null } } });
  });
  await page.goto("/hesabim/profil");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Ad", { exact: true }).fill("New Name");
  await page.getByLabel("Soyad", { exact: true }).fill("Updated");
  await expect(page.getByTitle(mockUser.email, { exact: true })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveCount(0);
  await expect(page.locator('input[name="phone"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByRole("button", { name: "Kaydediliyor…", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "İptal", exact: true })).toBeDisabled();
  await expect.poll(() => bodies).toEqual([{ firstName: "New Name", lastName: "Updated" }]);
  release();
  await expect(page.getByRole("status").filter({ hasText: "Profil bilgileriniz güncellendi." })).toBeVisible();
  await expect(page.locator("form")).toContainText("API Name");
  await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "Hesap durumu", exact: true }) }).getByText("Doğrulandı", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await expect(page.getByLabel("Ad", { exact: true })).toHaveValue("API Name");
});

test("cancel restores values without sending a PATCH", async ({ page, context }) => {
  let patches = 0;
  await context.route("**/api/local/auth/me", async (route) => {
    if (route.request().method() === "PATCH") patches++;
    return route.fallback();
  });
  await page.goto("/hesabim/profil");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Ad", { exact: true }).fill("Discard");
  await page.getByRole("button", { name: "İptal", exact: true }).click();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await expect(page.getByLabel("Ad", { exact: true })).toHaveValue(mockUser.firstName);
  expect(patches).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("API failure preserves the draft and allows a successful retry", async ({ page, context }) => {
  let attempts = 0;
  await context.route("**/api/local/auth/me", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 503, json: { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Raw server error" } } });
    return route.fulfill({ json: { success: true, data: { ...mockUser, ...route.request().postDataJSON() } } });
  });
  await page.goto("/hesabim/profil");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Ad", { exact: true }).fill("Retry Name");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.locator("#profile-save-error")).toContainText("Bilgileriniz kaydedilemedi.");
  await expect(page.locator("#profile-save-error")).not.toContainText("Raw server error");
  await expect(page.getByLabel("Ad", { exact: true })).toHaveValue("Retry Name");
  expect(attempts).toBe(1);
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.locator("form")).toContainText("Retry Name");
  await expect(page.getByRole("button", { name: "Düzenle", exact: true })).toBeVisible();
  expect(attempts).toBe(2);
});

test("profile keeps email read-only because the backend has no verified email-change endpoint", async ({ page, context }) => {
  let patches = 0;
  await context.route("**/api/local/auth/me", async (route) => {
    if (route.request().method() === "PATCH") patches++;
    return route.fallback();
  });
  await page.goto("/hesabim/profil");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await expect(page.getByTitle(mockUser.email, { exact: true })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveCount(0);
  await expect(page.getByText(/E-posta değişikliği henüz kullanıma açık değil/)).toBeVisible();
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  expect(patches).toBe(0);
});

test("unchanged email sends only the changed name, and unchanged forms send nothing", async ({ page, context }) => {
  const bodies: unknown[] = [];
  await context.route("**/api/local/auth/me", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, data: { ...mockUser, firstName: "Only Name" } } });
  });
  await page.goto("/hesabim/profil");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByRole("button", { name: "Düzenle", exact: true })).toBeVisible();
  expect(bodies).toEqual([]);
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Ad", { exact: true }).fill("Only Name");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByRole("button", { name: "Düzenle", exact: true })).toBeVisible();
  expect(bodies).toEqual([{ firstName: "Only Name" }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
