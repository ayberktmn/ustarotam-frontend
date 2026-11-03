import { expect, test } from "@playwright/test";

test("stores an explicit choice, stays dismissed and reopens from the footer", async ({ page }) => {
  const externalScripts: string[] = [];
  page.on("request", request => {
    if (request.resourceType() === "script" && new URL(request.url()).hostname !== "localhost") externalScripts.push(request.url());
  });

  await page.goto("/en");
  const notice = page.getByRole("region", {name: "Cookie preferences notice"});
  await expect(notice).toBeVisible();
  await notice.getByRole("button", {name: "Necessary only"}).click();
  await expect(notice).toHaveCount(0);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ustarotam_cookie_consent") ?? "null"));
  expect(stored).toMatchObject({version: 1, necessary: true, analytics: false, marketing: false});
  expect(externalScripts).toEqual([]);

  await page.reload();
  await expect(notice).toHaveCount(0);
  await page.getByRole("button", {name: "Cookie preferences"}).click();
  const dialog = page.getByRole("dialog", {name: "Cookie preferences"});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("switch", {name: "Necessary"})).toBeChecked();
  await expect(dialog.getByRole("switch", {name: "Necessary"})).toBeDisabled();
  await dialog.getByRole("switch", {name: "Allow analytics cookies"}).click();
  await dialog.getByRole("button", {name: "Save preferences"}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", {name: "Cookie preferences"})).toBeFocused();

  const updated = await page.evaluate(() => JSON.parse(localStorage.getItem("ustarotam_cookie_consent") ?? "null"));
  expect(updated).toMatchObject({necessary: true, analytics: true, marketing: false});
  expect(externalScripts).toEqual([]);
});

test("is keyboard accessible and fits a 320px Turkish viewport", async ({ page }) => {
  await page.setViewportSize({width: 320, height: 700});
  await page.goto("/");
  const notice = page.getByRole("region", {name: "Çerez tercihleri bildirimi"});
  await expect(notice).toBeVisible();
  await expect(page.getByRole("button", {name: "Tümünü kabul et"})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await notice.getByRole("button", {name: "Tercihleri yönet"}).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {name: "Çerez tercihleri"});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Şu anda kullanılmıyor").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(notice.getByRole("button", {name: "Tercihleri yönet"})).toBeFocused();
});
