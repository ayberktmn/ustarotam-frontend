import { test, expect, chromium } from "@playwright/test";
import { fillRegistration, mockAuth, mockUser, provinces } from "./auth-fixture";

test("81 API provinces: single combobox, Turkish search, selection, reopening and outside dismissal", async ({ page, context }) => {
  const state = await mockAuth(context);
  await page.goto("/kayit");
  const trigger = page.locator("#register-province");
  await expect(trigger).toBeEnabled();
  expect(state.calls.some(call => call.path === "/locations/provinces")).toBe(true);
  await expect(trigger).toContainText("İl seçin");
  await expect(page.getByRole("combobox", {name: "İl ara"})).toHaveCount(0);
  await expect(page.locator("form select")).toHaveCount(0);
  await trigger.click();
  const search = page.getByRole("combobox", {name: "İl ara", exact: true});
  await expect(search).toBeFocused();
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(81);
  await search.fill("İZMİR");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(1);
  await page.getByRole("option", {name: "İzmir", exact: true}).click();
  await expect(trigger).toContainText("İzmir");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.locator("#register-password")).toHaveValue("");
  await expect(page.locator('input[name="provinceId"]')).toHaveValue(provinces.data.find(item => item.name === "İzmir")!.id);
  await trigger.click();
  await expect(page.getByRole("option", {name: "İzmir", exact: true})).toHaveAttribute("aria-selected", "true");
  await search.fill("not-found");
  await expect(page.getByRole("status").filter({hasText: "İl bulunamadı"})).toBeVisible();
  await page.getByRole("button", {name: "Aramayı temizle"}).click();
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(81);
  await search.fill("ankara");
  await page.getByRole("option", {name: "Ankara", exact: true}).click();
  await expect(trigger).toContainText("Ankara");
  await trigger.click();
  await page.getByRole("heading", {name: "Hesap oluşturun", exact: true}).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  expect(state.calls.filter(call => call.path === "/auth/register")).toHaveLength(0);
});

test("keyboard navigation, Enter, Escape, Tab and clear search focus", async ({ page, context }) => {
  await mockAuth(context); await page.goto("/kayit");
  const trigger = page.locator("#register-province");
  await expect(trigger).toBeEnabled(); await trigger.focus(); await page.keyboard.press("ArrowDown");
  const search = page.getByRole("combobox", {name: "İl ara", exact: true});
  await expect(search).toBeFocused();
  await search.fill("ankara"); await search.press("Enter");
  await expect(trigger).toContainText("Ankara"); await expect(trigger).toBeFocused();
  await trigger.press("ArrowDown"); await search.press("ArrowDown");
  const activeId = await search.getAttribute("aria-activedescendant");
  expect(activeId).toBeTruthy();
  await search.press("Escape"); await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click(); await search.press("Tab");
  await expect(page.locator("#register-password")).toBeFocused();
  await trigger.click(); await search.press("Shift+Tab");
  await expect(page.locator("#register-phone")).toBeFocused();
  await trigger.click(); await search.fill("iz"); await search.press("Tab");
  await expect(page.getByRole("button", {name: "Aramayı temizle"})).toBeFocused();
  await page.keyboard.press("Enter"); await expect(search).toBeFocused(); await expect(search).toHaveValue("");
});

test("dropdown is portalled, bounded, scrollable and does not overflow mobile/desktop viewport", async ({ page, context }) => {
  await mockAuth(context); await page.goto("/kayit");
  const trigger = page.locator("#register-province");
  await expect(trigger).toBeEnabled(); await trigger.scrollIntoViewIfNeeded(); await trigger.click();
  const dialog = page.getByRole("dialog", {name: "İkamet ili"});
  await expect(dialog).toBeVisible();
  const geometry = await dialog.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const list = element.querySelector('[role="listbox"]')!;
    return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      width: innerWidth, height: innerHeight, content: list.scrollHeight, viewport: list.clientHeight,
      side: element.getAttribute("data-side"), formParent: Boolean(element.closest("form")),
      bodyWidth: document.documentElement.scrollWidth};
  });
  expect(geometry.formParent).toBe(false);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 1);
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.width);
  expect(geometry.content).toBeGreaterThan(geometry.viewport);
  expect(["top", "bottom"]).toContain(geometry.side);
  const searchBox = await page.getByRole("combobox", {name: "İl ara", exact: true}).boundingBox();
  const listBox = await page.getByRole("listbox").boundingBox();
  expect(searchBox!.y).toBeLessThan(listBox!.y);
  await page.getByRole("option", {name: "Zonguldak", exact: true}).scrollIntoViewIfNeeded();
  await expect(page.getByRole("combobox", {name: "İl ara", exact: true})).toBeVisible();
  await page.screenshot({path: `test-results/combobox-${test.info().project.name}.png`});
  await page.keyboard.press("Escape");
  await trigger.evaluate(element => window.scrollBy(0, element.getBoundingClientRect().top - 90));
  await trigger.click();
  await expect(dialog).toHaveAttribute("data-side", "bottom");
  await page.keyboard.press("Escape");
});

test("registration validates every field and submits once with the canonical province ID", async ({ page, context }) => {
  const state = await mockAuth(context); await page.goto("/kayit");
  await page.getByRole("button", {name: "Hesap Oluştur", exact: true}).click();
  for (const id of ["register-first-name", "register-last-name", "register-email", "register-province", "register-password", "register-confirm"]) {
    await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "true");
  }
  expect(state.calls.filter(call => call.path === "/auth/register")).toHaveLength(0);
  await fillRegistration(page);
  await page.locator("#register-phone").fill("123");
  await page.getByRole("button", {name: "Hesap Oluştur", exact: true}).click();
  await expect(page.locator("#register-phone")).toHaveAttribute("aria-invalid", "true");
  expect(state.calls.filter(call => call.path === "/auth/register")).toHaveLength(0);
  await page.locator("#register-phone").fill("");
  // Dispatch two submit events in one frame to exercise the synchronous guard.
  await page.locator("form").evaluate(form => {
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
  });
  await expect(page.getByRole("heading", {name: "Kaydınız oluşturuldu"})).toBeVisible();
  const registrations = state.calls.filter(call => call.path === "/auth/register");
  expect(registrations).toHaveLength(1);
  expect(registrations[0].body).toMatchObject({provinceId: provinces.data.find(item => item.name === "Ankara")!.id, termsAccepted: true, privacyAccepted: true});
  expect(registrations[0].body).not.toHaveProperty("phone");
  expect(state.calls.some(call => call.path === "/auth/logout")).toBe(true);
  await expect(page).toHaveURL(/\/kayit$/);
  await page.getByRole("button", {name: "Doğrulama e-postasını tekrar gönder"}).click();
  await expect(page.getByRole("status").filter({hasText: "Doğrulama bağlantısı gönderilebildiyse"})).toBeVisible();
  expect((await context.cookies()).some(item => item.name === "usta_rotam_dev_refresh")).toBe(false);
});

test("registration server error preserves fields and permits a deliberate retry", async ({ page, context }) => {
  const state = await mockAuth(context); state.registerCode = "REGISTRATION_UNAVAILABLE";
  await page.goto("/kayit"); await fillRegistration(page);
  await page.getByRole("button", {name: "Hesap Oluştur", exact: true}).click();
  await expect(page.getByRole("alert").filter({hasText: "Bu e-posta ile kayıt oluşturulamıyor"}).first()).toBeVisible();
  await expect(page.locator("#register-email")).toHaveValue(mockUser.email);
  await expect(page.locator("#register-province")).toContainText("Ankara");
  state.registerCode = null;
  await page.getByRole("button", {name: "Hesap Oluştur", exact: true}).click();
  await expect(page.getByRole("heading", {name: "Kaydınız oluşturuldu"})).toBeVisible();
  expect(state.calls.filter(call => call.path === "/auth/register")).toHaveLength(2);
});

test("names, email, password policy, confirmation and consent validate independently", async ({ page, context }) => {
  const state = await mockAuth(context); await page.goto("/kayit"); await fillRegistration(page);
  await page.locator("#register-first-name").fill("A");
  await page.locator("#register-last-name").fill("B");
  await page.locator("#register-email").fill("invalid-email");
  await page.locator("#register-password").fill("weak");
  await page.locator("#register-confirm").fill("different");
  await page.locator('input[name="terms"]').uncheck();
  await page.getByRole("button", {name: "Hesap Oluştur", exact: true}).click();
  for (const id of ["register-first-name", "register-last-name", "register-email", "register-password", "register-confirm"]) {
    await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "true");
  }
  await expect(page.locator('input[name="terms"]')).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#register-province")).toHaveAttribute("aria-invalid", "false");
  expect(state.calls.filter(call => call.path === "/auth/register")).toHaveLength(0);
});

test("registration cleanup failure is retried without creating the account again", async ({ page, context }) => {
  const state = await mockAuth(context); state.logoutFail = true;
  await page.goto("/kayit"); await fillRegistration(page);
  await page.getByRole("button", {name: "Hesap Oluştur", exact: true}).click();
  await expect(page.getByRole("alert").filter({hasText: "kayıt oturumu sonlandırılamadı"})).toBeVisible();
  state.logoutFail = false;
  await page.getByRole("button", {name: "Tekrar dene", exact: true}).click();
  await expect(page.getByRole("button", {name: "Doğrulama e-postasını tekrar gönder"})).toBeVisible();
  expect(state.calls.filter(call => call.path === "/auth/register")).toHaveLength(1);
});

test("email delivery failure after account creation offers resend without another registration", async ({ page, context }) => {
  const state = await mockAuth(context); state.registerCode = "EMAIL_DELIVERY_FAILED";
  await page.goto("/kayit"); await fillRegistration(page);
  await page.getByRole("button", {name: "Hesap Oluştur", exact: true}).click();
  await expect(page.getByRole("heading", {name: "Kaydınız oluşturuldu"})).toBeVisible();
  await expect(page.getByRole("status").filter({hasText: "gönderilemedi"})).toBeVisible();
  await page.getByRole("button", {name: "Doğrulama e-postasını tekrar gönder"}).click();
  await expect(page.getByRole("status").filter({hasText: "Doğrulama bağlantısı gönderilebildiyse"})).toBeVisible();
  expect(state.calls.filter(call => call.path === "/auth/register")).toHaveLength(1);
});

test("province load failure exposes retry and recovers", async ({ page, context }) => {
  const state = await mockAuth(context); state.provincesFail = true;
  await page.goto("/kayit");
  await expect(page.getByText("İller yüklenemedi. Lütfen tekrar deneyin.", {exact: true})).toBeVisible({timeout: 30_000});
  state.provincesFail = false;
  await page.getByRole("button", {name: "Tekrar dene", exact: true}).click();
  await expect(page.locator("#register-province")).toBeEnabled();
  await page.locator("#register-province").click(); await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(81);
});

test("wrong password, unverified email and resend are handled without fake remember/reset controls", async ({ page, context }) => {
  const state = await mockAuth(context); state.loginCode = "INVALID_CREDENTIALS";
  await page.goto("/giris");
  await page.locator("#login-email").fill(mockUser.email); await page.locator("#login-password").fill("WrongPassword1!");
  await page.getByRole("button", {name: "Giriş Yap", exact: true}).click();
  await expect(page.getByRole("alert").filter({hasText: "E-posta veya şifre hatalı"}).first()).toBeVisible();
  state.loginCode = "EMAIL_NOT_VERIFIED";
  await page.getByRole("button", {name: "Giriş Yap", exact: true}).click();
  await expect(page.getByRole("button", {name: "Doğrulama e-postasını tekrar gönder"})).toBeVisible();
  await page.getByRole("button", {name: "Doğrulama e-postasını tekrar gönder"}).click();
  await expect.poll(() => state.calls.filter(call => call.path === "/auth/email-verification/resend").length).toBe(1);
  await expect(page.getByRole("button", {name: "Doğrulama e-postasını tekrar gönder"})).toBeDisabled();
  await expect(page.getByText(/Tekrar göndermek için \d+ saniye bekleyin/)).toBeVisible();
  expect(state.calls.find(call => call.path === "/auth/email-verification/resend")?.body).toEqual({email: mockUser.email});
  await expect(page.locator('input[name="rememberMe"]')).toBeEnabled();
  await expect(page.getByRole("link", {name: "Şifremi unuttum"})).toHaveAttribute("href", "/sifremi-unuttum");
});

test("login/me, reload, new tab, refresh expiry and logout use an HttpOnly cookie with memory-only access", async ({ page, context }) => {
  const state = await mockAuth(context);
  // Return to a local health document to keep panel pages outside this test's scope.
  await page.goto("/giris?returnUrl=%2Fapi%2Fhealth");
  await page.locator("#login-email").fill(mockUser.email); await page.locator("#login-password").fill("ValidPassword1!");
  await page.getByRole("button", {name: "Giriş Yap", exact: true}).click();
  await expect(page).toHaveURL(/\/api\/health$/);
  expect(state.calls.some(call => call.path === "/auth/me")).toBe(true);
  const session = (await context.cookies()).find(item => item.name === "usta_rotam_dev_refresh");
  expect(session?.httpOnly).toBe(true); expect(session?.sameSite).toBe("Strict");
  await page.goto("/giris?returnUrl=%2Fapi%2Fhealth");
  await expect(page).toHaveURL(/\/api\/health$/);
  const other = await context.newPage();
  await other.goto("/giris?returnUrl=%2Fapi%2Fhealth"); await expect(other).toHaveURL(/\/api\/health$/);
  expect(state.calls.filter(call => call.path === "/auth/me").length).toBeGreaterThanOrEqual(3);
  const storage = await page.evaluate(() => ({local: {...localStorage}, session: {...sessionStorage}, cookies: document.cookie}));
  expect(JSON.stringify(storage)).not.toContain("mock.access.token");
  expect(storage.cookies).not.toContain("mock-session");
  const loginCountBeforeLogout = state.calls.filter(call => call.path === "/auth/login").length;
  const refreshCountBeforeLogout = state.calls.filter(call => call.path === "/auth/refresh").length;
  await page.evaluate(async () => { await fetch("/api/local/auth/logout", {method: "POST", credentials: "include"}); });
  expect(state.calls.filter(call => call.path === "/auth/login")).toHaveLength(loginCountBeforeLogout);
  expect(state.calls.filter(call => call.path === "/auth/refresh")).toHaveLength(refreshCountBeforeLogout);
  expect((await context.cookies()).find(item => item.name === "usta_rotam_dev_refresh")).toBeUndefined();
  await page.goto("/giris"); await expect(page.locator("#login-email")).toBeVisible();
  await context.addCookies([{name: "usta_rotam_dev_refresh", value: "mock-session", domain: "localhost", path: "/api/local/auth", httpOnly: true, sameSite: "Strict"}]);
  state.refreshExpired = true;
  await page.reload(); await expect(page.locator("#login-email")).toBeVisible();
});

test("remember me controls persistent versus session refresh cookies", async ({ page, context }) => {
  const state = await mockAuth(context);
  await page.goto("/giris?returnUrl=%2Fapi%2Fhealth");
  await page.locator('input[name="rememberMe"]').check();
  await page.locator("#login-email").fill(mockUser.email);
  await page.locator("#login-password").fill("ValidPassword1!");
  await page.getByRole("button", {name: "Giriş Yap", exact: true}).click();
  await expect(page).toHaveURL(/\/api\/health$/);
  expect(state.calls.find(call => call.path === "/auth/login")?.body).toEqual({email: mockUser.email, password: "ValidPassword1!", rememberMe: true});
  const persistent = (await context.cookies()).find(item => item.name === "usta_rotam_dev_refresh");
  expect(persistent?.expires).toBeGreaterThan(Date.now() / 1000 + 29 * 86_400);
  expect(persistent?.expires).toBeLessThanOrEqual(Date.now() / 1000 + 30 * 86_400 + 60);
});

test("session cookie survives reload but has no persistent expiry", async ({ page, context }) => {
  const state = await mockAuth(context);
  await page.goto("/giris?returnUrl=%2Fapi%2Fhealth");
  await page.locator("#login-email").fill(mockUser.email);
  await page.locator("#login-password").fill("ValidPassword1!");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/api\/health$/);
  const session = (await context.cookies()).find(item => item.name === "usta_rotam_dev_refresh");
  expect(session?.expires).toBe(-1);
  await page.goto("/giris?returnUrl=%2Fapi%2Fhealth");
  await expect(page).toHaveURL(/\/api\/health$/);
  expect(state.calls.filter(call => call.path === "/auth/refresh").length).toBeGreaterThanOrEqual(1);
});

test("remember me survives a real Chromium profile restart while a session cookie does not", async ({}, testInfo) => {
  async function loginAndRestart(profile: string, rememberMe: boolean): Promise<{restored: boolean; refreshCalls: number}> {
    const profilePath = testInfo.outputPath(profile);
    let persistentContext = await chromium.launchPersistentContext(profilePath, {headless: true, locale: "tr-TR"});
    await mockAuth(persistentContext);
    let persistentPage = persistentContext.pages()[0] ?? await persistentContext.newPage();
    await persistentPage.goto("http://localhost:3000/giris?returnUrl=%2Fapi%2Fhealth");
    if (rememberMe) await persistentPage.locator('input[name="rememberMe"]').check();
    await persistentPage.locator("#login-email").fill(mockUser.email);
    await persistentPage.locator("#login-password").fill("ValidPassword1!");
    await persistentPage.locator('button[type="submit"]').click();
    await expect(persistentPage).toHaveURL(/\/api\/health$/);
    await persistentContext.close();

    persistentContext = await chromium.launchPersistentContext(profilePath, {headless: true, locale: "tr-TR"});
    const restartedState = await mockAuth(persistentContext);
    persistentPage = persistentContext.pages()[0] ?? await persistentContext.newPage();
    await persistentPage.goto("http://localhost:3000/giris?returnUrl=%2Fapi%2Fhealth");
    if (rememberMe) await expect(persistentPage).toHaveURL(/\/api\/health$/);
    else await expect(persistentPage.locator("#login-email")).toBeVisible();
    // HttpOnly cookies cannot be inspected by JS. Bootstrap probes once even
    // without a cookie; the mock intercepts that browser probe before the
    // gateway can reject it locally. Wait so the count is not timing-dependent.
    await expect.poll(() => restartedState.calls.filter(call => call.path === "/auth/refresh").length).toBe(1);
    const restored = /\/api\/health$/.test(persistentPage.url());
    await persistentContext.close();
    return {restored, refreshCalls: restartedState.calls.filter(call => call.path === "/auth/refresh").length};
  }

  await expect(loginAndRestart("remember-profile", true)).resolves.toMatchObject({restored: true, refreshCalls: 1});
  await expect(loginAndRestart("session-profile", false)).resolves.toMatchObject({restored: false, refreshCalls: 1});
});

test("password reset request is non-enumerating and reset token is removed then submitted once", async ({ page, context }) => {
  const state = await mockAuth(context);
  await page.goto("/sifremi-unuttum");
  await page.locator("#reset-email").fill("unknown@example.test");
  await page.getByRole("button", {name: "Sıfırlama bağlantısı gönder"}).click();
  await expect(page.getByRole("heading", {name: "Talebiniz alındı"})).toBeVisible();
  await expect(page.getByText("Bu adresle eşleşen bir hesap varsa şifre sıfırlama talimatları kısa süre içinde iletilecektir.")).toBeVisible();
  const token = "r".repeat(48);
  await page.goto(`/sifremi-sifirla?token=${token}`);
  await expect(page).toHaveURL(/\/sifremi-sifirla$/);
  await page.locator("#reset-password").fill("Reset!Password123");
  await page.locator("#reset-confirm").fill("Reset!Password123");
  await page.getByRole("button", {name: "Şifreyi güncelle"}).click();
  await expect(page.getByRole("heading", {name: "Şifreniz değiştirildi"})).toBeVisible();
  await expect(page.getByRole("link", {name: "Giriş yap"})).toHaveAttribute("href", "/giris");
  const resets = state.calls.filter(call => call.path === "/auth/password-reset/confirm");
  expect(resets).toHaveLength(1);
  expect(resets[0].body).toEqual({token, newPassword: "Reset!Password123"});
  state.resetCode = "INVALID_VERIFICATION_TOKEN";
  await page.goto(`/sifremi-sifirla?token=${"x".repeat(48)}`);
  await page.locator("#reset-password").fill("Reset!Password123");
  await page.locator("#reset-confirm").fill("Reset!Password123");
  await page.getByRole("button", {name: "Şifreyi güncelle"}).click();
  await expect(page.getByRole("alert").filter({hasText: "geçersiz veya süresi dolmuş"})).toBeVisible();
});

test("terms and privacy dialogs are modal, keyboard dismissible and do not check consent", async ({ page, context }) => {
  await mockAuth(context); await page.goto("/kayit");
  const checkbox = page.locator('input[name="terms"]');
  await page.getByRole("button", {name: "Kullanım koşulları"}).click();
  await expect(page.getByRole("dialog", {name: "Kullanım Koşulları"})).toBeVisible();
  await expect(page.getByText("Taslak – yayın öncesi hukuki inceleme gerektirir")).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", {name: "Kullanım Koşulları"})).toHaveCount(0);
  await page.getByRole("button", {name: "Gizlilik politikası"}).click();
  const privacy = page.getByRole("dialog", {name: "Gizlilik Politikası"});
  await expect(privacy).toBeVisible();
  await expect(privacy.getByText("[UNVAN], [ADRES], [E-POSTA].", {exact: false})).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await privacy.locator("button").first().click();
  await expect(privacy).toHaveCount(0);
});

test("email verification shows success only after backend confirmation and handles expired links", async ({ page, context }) => {
  const state = await mockAuth(context);
  await page.goto("/email-verified");
  await expect(page.getByRole("heading", {name: "E-posta adresiniz doğrulandı", exact: true})).toBeVisible();
  expect(state.calls.some(call => call.path === "/auth/email-verification/confirm")).toBe(false);
  await page.goto(`/email-verified?token=${"x".repeat(48)}`);
  await expect(page).toHaveURL(/\/email-verified$/);
  await page.getByRole("button", {name: "E-posta adresimi doğrula"}).click();
  await expect(page.getByRole("heading", {name: "E-posta adresiniz doğrulandı"})).toBeVisible();
  state.verifyCode = "INVALID_VERIFICATION_TOKEN";
  await page.goto(`/email-verified?token=${"y".repeat(48)}`);
  await page.getByRole("button", {name: "E-posta adresimi doğrula"}).click();
  await expect(page.getByRole("alert").filter({hasText: "geçersiz veya süresi dolmuş"})).toBeVisible();
  await expect(page.getByRole("heading", {name: "E-posta adresiniz doğrulandı"})).toHaveCount(0);
});

test("English registration has the same accessible combobox and validation", async ({ page, context }) => {
  await mockAuth(context); await page.goto("/en/register");
  await expect(page.locator("#register-province")).toBeEnabled();
  await page.locator("#register-province").click();
  await expect(page.getByRole("combobox", {name: "Search provinces"})).toBeFocused();
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(81);
  await page.keyboard.press("Escape");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#register-province")).toHaveAttribute("aria-invalid", "true");
});
