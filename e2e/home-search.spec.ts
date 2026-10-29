import { test, expect } from "@playwright/test";
import { mockAuth, specialtyCatalog } from "./auth-fixture";

test("home catalog dropdowns search, select, stay below the trigger and submit API values", async ({page, context}) => {
  const state = await mockAuth(context);
  await page.goto("/");

  const province = page.locator("#hero-sehir");
  await expect(province).toBeEnabled();
  await province.click();
  const provinceSearch = page.getByRole("combobox", {name: "İl ara", exact: true});
  await provinceSearch.fill("ankara");
  await page.getByRole("option", {name: "Ankara", exact: true}).click();
  await expect(province).toContainText("Ankara");

  const category = page.locator("#hero-hizmet");
  await expect(category).toBeEnabled();
  await category.press("ArrowDown");
  const categoryDialog = page.getByRole("dialog", {name: "Hizmet Kategorisi"});
  await expect(categoryDialog).toHaveAttribute("data-side", "bottom");
  const categorySearch = page.getByRole("combobox", {name: "Kategori ara", exact: true});
  await categorySearch.fill("fren");
  await categorySearch.press("Escape");
  await expect(category).toHaveAttribute("aria-expanded", "false");
  await category.press("ArrowDown");
  await page.getByRole("combobox", {name: "Kategori ara", exact: true}).fill("fren");
  await page.getByRole("combobox", {name: "Kategori ara", exact: true}).press("Enter");
  await expect(category).toContainText("Fren Sistemi");

  await page.getByRole("button", {name: "Usta Bul", exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`/usta-ara\\?sehir=Ankara&uzmanlik=${specialtyCatalog[0].slug}$`));
  expect(state.calls.some(call => call.path === "/locations/provinces")).toBe(true);
  expect(state.calls.some(call => call.path === "/specialties")).toBe(true);
});

test("home catalog failures show retry controls without fake options", async ({page, context}) => {
  const state = await mockAuth(context);
  state.provincesFail = true;
  state.specialtiesFail = true;
  await page.goto("/");
  await expect(page.getByRole("alert").filter({hasText: "İller yüklenemedi"})).toBeVisible();
  await expect(page.getByRole("alert").filter({hasText: "Kategoriler yüklenemedi"})).toBeVisible();
  await expect(page.locator("#hero-sehir")).toHaveCount(0);
  await expect(page.locator("#hero-hizmet")).toHaveCount(0);
  state.provincesFail = false;
  state.specialtiesFail = false;
  await page.getByRole("alert").filter({hasText: "İller yüklenemedi"}).getByRole("button").click();
  await page.getByRole("alert").filter({hasText: "Kategoriler yüklenemedi"}).getByRole("button").click();
  await expect(page.locator("#hero-sehir")).toBeEnabled();
  await expect(page.locator("#hero-hizmet")).toBeEnabled();
});

test("home workshop CTA appears below the customer CTA and uses the existing application route", async ({page, context}) => {
  await mockAuth(context);
  await page.goto("/");
  const customer = page.getByRole("link", {name: "Usta Aramaya Başlayın", exact: true});
  const workshop = page.getByRole("link", {name: "Usta Olarak Katıl", exact: true}).last();
  await expect(workshop).toHaveAttribute("href", "/usta-ol");
  await expect(page.getByRole("heading", {name: "UstaRotam’a Katılın!"})).toBeVisible();
  const customerBox = await customer.boundingBox();
  const workshopBox = await workshop.boundingBox();
  expect(customerBox && workshopBox && workshopBox.y > customerBox.y).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
