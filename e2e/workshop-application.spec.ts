import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mockAuth, mockUser, provinces } from "./auth-fixture";

const ankara = provinces.data.find(item => item.name === "Ankara")!;
const izmir = provinces.data.find(item => item.name === "İzmir")!;
const district = {id: "00000000-0000-4000-8000-000000000200", name: "Çankaya"};
const site = {id: "00000000-0000-4000-8000-000000000201", name: "Test Sanayi"};
const vehicleType = {id: "00000000-0000-4000-8000-000000000202", name: "Automobile"};
const brand = {id: "00000000-0000-4000-8000-000000000203", name: "Toyota"};
let mineFixture: {success: boolean; data: Array<Record<string, unknown>>; meta: {page: number; limit: number; total: number; totalPages: number}} = {success: true, data: [], meta: {page: 1, limit: 100, total: 0, totalPages: 0}};

test.beforeEach(async ({context}) => {
  await mockAuth(context);
  mineFixture = {success: true, data: [], meta: {page: 1, limit: 100, total: 0, totalPages: 0}};
  await context.addCookies([{name: "usta_rotam_dev_refresh", value: "mock-session", domain: "localhost", path: "/api/local/auth", httpOnly: true}]);
  await context.route("**/api/local/workshop-applications/mine*", route => route.fulfill({json: mineFixture}));
  await context.route("**/api/local/locations/provinces/*/districts", route => route.fulfill({json: {success: true, data: route.request().url().includes(ankara.id) ? [district] : []}}));
  await context.route("**/api/local/locations/districts/*/industrial-sites", route => route.fulfill({json: {success: true, data: [site]}}));
  await context.route("**/api/local/vehicles/types", route => route.fulfill({json: {success: true, data: [vehicleType]}}));
  await context.route("**/api/local/vehicles/brands", route => route.fulfill({json: {success: true, data: [brand]}}));
});

async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("combobox", {name: label, exact: true}).click();
  await page.getByRole("option", {name: option, exact: true}).click();
}

async function reachServices(page: Page): Promise<void> {
  await page.goto("/en/join-as-workshop");
  await page.getByLabel("Business name").fill("Test Service");
  await page.getByLabel("Business phone").fill("05551234567");
  await page.getByLabel("Business address").fill("Test Street 12 Ankara");
  await page.getByRole("button", {name: "Next", exact: true}).click();
  await choose(page, "Province", "Ankara");
  await choose(page, "District", district.name);
  await page.getByRole("button", {name: "Next", exact: true}).click();
}

async function reachLocation(page: Page): Promise<void> {
  await page.goto("/en/join-as-workshop");
  await page.getByLabel("Business name").fill("Test Service");
  await page.getByLabel("Business phone").fill("05551234567");
  await page.getByLabel("Business address").fill("Test Street 12 Ankara");
  await page.getByRole("button", {name: "Next", exact: true}).click();
}

async function selectServices(page: Page): Promise<void> {
  await page.getByLabel("Automobile", {exact: true}).check();
  await page.getByLabel("Toyota", {exact: true}).check();
  await page.getByLabel("Fren Sistemi", {exact: true}).check();
}

function application() {
  return {id: "real-application-id", applicationId: "real-application-id", status: "PENDING", name: "Test Service", businessType: "SAHIS", phone: "05551234567", address: "Test Street 12 Ankara", province: ankara, district, industrialSite: site, vehicleTypes: [vehicleType], brands: [brand], specialties: [{id: "00000000-0000-4000-8000-000000000101", name: "Fren Sistemi"}]};
}

async function mockSubmission(context: BrowserContext): Promise<{applicationCount: () => number; uploads: () => {type: string; contentType?: string; body: Buffer}[]}> {
  let count = 0; const uploaded: {type: string; contentType?: string; body: Buffer}[] = [];
  await context.route("**/api/local/workshop-applications/mine*", route => {
    const url = new URL(route.request().url());
    const data = url.searchParams.get("status") === "DRAFT"
      ? [{...application(), status: "DRAFT"}]
      : [];
    return route.fulfill({json: {success: true, data, meta: {page: 1, limit: 100, total: data.length, totalPages: 1}}});
  });
  await context.route("**/api/local/workshop-applications/drafts", route => {count++; return route.fulfill({status: 201, json: {success: true, data: {...application(), status: "DRAFT"}}});});
  await context.route("**/api/local/workshop-applications/real-application-id", route => route.fulfill({status: 200, json: {success: true, data: {...application(), status: "DRAFT"}}}));
  await context.route("**/api/local/workshop-applications/real-application-id/submit", route => route.fulfill({status: 200, json: {success: true, data: application()}}));
  await context.route("**/api/local/workshop-applications/real-application-id/documents", route => route.fulfill({json: {success: true, data: uploaded.map(({type}) => ({id: `${type}-id`, documentType: type, status: "PENDING"}))}}));
  await context.route("**/api/local/workshop-applications/real-application-id/documents/**", route => {
    const type = route.request().url().split("/").at(-1)!;
    uploaded.push({type, contentType: route.request().headers()["content-type"], body: route.request().postDataBuffer() ?? Buffer.alloc(0)});
    return route.fulfill({status: 201, json: {success: true, data: {id: `${type}-id`, documentType: type, status: "PENDING"}}});
  });
  return {applicationCount: () => count, uploads: () => uploaded};
}

test("hero links to the application page without overflow", async ({page}) => {
  await page.goto("/");
  const links = page.getByRole("link", {name: "Usta Olarak Katıl", exact: true});
  await expect(links).toHaveCount(2);
  for (let index = 0; index < await links.count(); index++) await expect(links.nth(index)).toHaveAttribute("href", "/usta-ol");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("signed out visitors retain the localized return URL", async ({page, context}) => {
  await context.clearCookies(); await page.goto("/en/join-as-workshop?source=hero");
  await expect(page).toHaveURL(/\/en\/login\?/);
  expect(new URL(page.url()).searchParams.get("returnUrl")).toBe("/en/join-as-workshop?source=hero");
});

test("required fields and parent location selections are enforced", async ({page}) => {
  await page.goto("/en/join-as-workshop");
  await page.getByRole("button", {name: "Next", exact: true}).click();
  await expect(page.locator("#application-name")).toBeFocused();
  await expect(page.locator("#application-name-error")).toBeVisible();
  await page.getByLabel("Business name").fill("Test Service"); await page.getByLabel("Business phone").fill("05551234567"); await page.getByLabel("Business address").fill("Test Street 12");
  await page.getByRole("button", {name: "Next", exact: true}).click();
  await expect(page.getByRole("combobox", {name: "District"})).toBeDisabled();
  await choose(page, "Province", ankara.name); await choose(page, "District", district.name); await page.getByLabel("Industrial site (optional)").fill(site.name); await choose(page, "Province", izmir.name);
  await expect(page.locator('input[name="district"]')).toHaveValue(""); await expect(page.locator('input[name="site"]')).toHaveValue("");
});

test("district loading distinguishes loading, empty, error and retry states", async ({page, context}) => {
  let attempts = 0;
  await context.route(`**/api/local/locations/provinces/${ankara.id}/districts`, async route => {
    attempts++;
    if (attempts === 1) return route.fulfill({status: 503, json: {success: false, error: {code: "SERVICE_UNAVAILABLE", message: "private"}}});
    await route.fulfill({json: {success: true, data: [district], meta: {count: 1}}});
  });
  await reachLocation(page);
  await choose(page, "Province", "Ankara");
  await expect(page.getByText("Districts could not be loaded. Try again.")).toBeVisible();
  await page.getByRole("button", {name: "Try again", exact: true}).click();
  await expect(page.getByRole("combobox", {name: "District"})).toBeEnabled();
  await choose(page, "Province", izmir.name);
  await expect(page.getByText("No districts were found for this province.")).toBeVisible();
});

test("rapid province changes cannot expose stale districts and cached provinces are not fetched twice", async ({page, context}) => {
  const izmirDistrict = {id: "00000000-0000-4000-8000-000000000299", name: "Konak"};
  let ankaraCalls = 0;
  await context.route("**/api/local/locations/provinces/*/districts", async route => {
    const isAnkara = route.request().url().includes(ankara.id);
    if (isAnkara) { ankaraCalls++; await new Promise(resolve => setTimeout(resolve, 400)); }
    await route.fulfill({json: {success: true, data: isAnkara ? [district] : [izmirDistrict], meta: {count: 1}}});
  });
  await reachLocation(page);
  await choose(page, "Province", "Ankara");
  await expect(page.getByRole("status").filter({hasText: "Loading districts..."})).toBeVisible();
  await choose(page, "Province", izmir.name);
  await expect(page.getByRole("combobox", {name: "District"})).toBeEnabled();
  await page.getByRole("combobox", {name: "District"}).click();
  await expect(page.getByRole("option", {name: "Konak"})).toBeVisible();
  await expect(page.getByRole("option", {name: district.name})).toHaveCount(0);
  expect(ankaraCalls).toBe(1);
});

test("district results are reused from the province-specific cache", async ({page, context}) => {
  let ankaraCalls = 0;
  const izmirDistrict = {id: "00000000-0000-4000-8000-000000000299", name: "Konak"};
  await context.route("**/api/local/locations/provinces/*/districts", route => {
    const isAnkara = route.request().url().includes(ankara.id);
    if (isAnkara) ankaraCalls++;
    return route.fulfill({json: {success: true, data: isAnkara ? [district] : [izmirDistrict], meta: {count: 1}}});
  });
  await reachLocation(page);
  await choose(page, "Province", "Ankara");
  await expect(page.getByRole("combobox", {name: "District"})).toBeEnabled();
  await choose(page, "Province", izmir.name);
  await expect(page.getByRole("combobox", {name: "District"})).toBeEnabled();
  await choose(page, "Province", "Ankara");
  await expect(page.getByRole("combobox", {name: "District"})).toBeEnabled();
  expect(ankaraCalls).toBe(1);
});

test("business type select shows localized labels backed by exact API enum values", async ({page}) => {
  await page.goto("/usta-ol");
  const select = page.locator("#application-businessType");
  await expect(select.locator("option")).toHaveText(["Şahıs", "Limited", "Anonim"]);
  expect(await select.locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(["SAHIS", "LIMITED", "ANONIM"]);
});

test("application submits once and uploads validated raw documents", async ({page, context}) => {
  const writes = await mockSubmission(context); await reachServices(page); await selectServices(page);
  await page.getByRole("button", {name: "Review details"}).click();
  await expect(page.getByRole("heading", {name: "Documents"}).first()).toBeVisible();
  await page.getByLabel("Tax certificate").setInputFiles({name: "bad.png", mimeType: "image/png", buffer: Buffer.from("test")});
  await expect(page.locator("form").getByRole("alert")).toContainText("PDF or DOCX");
  for (const label of ["Tax certificate", "Workplace operating license", "Chamber registration"]) await page.getByLabel(label).setInputFiles({name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 test")});
  await expect.poll(() => writes.uploads().length).toBe(3);
  await expect(page.getByText("All required documents have been uploaded.")).toBeVisible();
  await page.getByRole("button", {name: "Next", exact: true}).click();
  await page.getByRole("button", {name: "Submit application"}).click();
  await expect(page.getByRole("heading", {name: "Application status"})).toBeVisible();
  expect(writes.applicationCount()).toBe(1); expect(writes.uploads()).toHaveLength(3);
  expect(writes.uploads().every(upload => upload.contentType === "application/pdf" && upload.body.toString().startsWith("%PDF"))).toBe(true);
});

test("a pending application with missing documents remains read-only", async ({page, context}) => {
  await context.route("**/api/local/workshop-applications/mine*", route => route.fulfill({json: {success: true, data: [application()], meta: {page: 1, limit: 100, total: 1, totalPages: 1}}}));
  await context.route("**/api/local/workshop-applications/real-application-id/documents", route => route.fulfill({json: {success: true, data: [], meta: {count: 0}}}));
  await page.goto("/en/join-as-workshop");
  await expect(page.getByRole("heading", {name: "Application status"})).toBeVisible();
  await expect(page.getByRole("heading", {name: "Documents"})).toBeVisible();
  await expect(page.getByLabel("Tax certificate")).toHaveCount(0);
  await expect(page.getByRole("button", {name: "Submit application"})).toHaveCount(0);
});

test("a pending application with complete documents shows the review state", async ({page, context}) => {
  const documents = ["TAX_CERTIFICATE", "WORKPLACE_LICENSE", "CHAMBER_REGISTRATION"].map(type => ({id: `${type}-id`, documentType: type, status: "PENDING"}));
  await context.route("**/api/local/workshop-applications/mine*", route => route.fulfill({json: {success: true, data: [application()], meta: {page: 1, limit: 100, total: 1, totalPages: 1}}}));
  await context.route("**/api/local/workshop-applications/real-application-id/documents", route => route.fulfill({json: {success: true, data: documents}}));
  await page.goto("/en/join-as-workshop");
  await expect(page.getByText("Your application is under review.", {exact: true})).toBeVisible();
  await expect(page.getByRole("button", {name: "Upload selected documents"})).toHaveCount(0);
});

test("a pending application on a later page is found before rendering a new form", async ({page, context}) => {
  await page.route("**/api/local/workshop-applications/mine*", route => {
    const pageNumber = new URL(route.request().url()).searchParams.get("page");
    const data = pageNumber === "1" ? [{...application(), applicationId: "rejected-id", status: "REJECTED"}] : [application()];
    return route.fulfill({json: {success: true, data, meta: {page: Number(pageNumber), limit: 100, total: 2, totalPages: 2}}});
  });
  await context.route("**/api/local/workshop-applications/real-application-id/documents", route => route.fulfill({json: {success: true, data: []}}));
  await context.route("**/api/local/workshop-applications/rejected-id/documents", route => route.fulfill({json: {success: true, data: []}}));
  await page.goto("/en/join-as-workshop");
  await expect(page.getByText("Pending review", {exact: true})).toBeVisible();
  await expect(page.locator("#application-name")).toHaveCount(0);
});

test("a 409 pending conflict reloads and opens the existing application without another POST", async ({page, context}) => {
  let mineCalls = 0; let postCalls = 0;
  mineFixture = {success: true, data: [], meta: {page: 1, limit: 100, total: 0, totalPages: 0}};
  await page.route("**/api/local/workshop-applications/mine*", route => { mineCalls++; return route.fulfill({json: mineCalls === 1 ? {success: true, data: [], meta: {page: 1, limit: 100, total: 0, totalPages: 0}} : {success: true, data: [application()], meta: {page: 1, limit: 100, total: 1, totalPages: 1}}}); });
  await context.route("**/api/local/workshop-applications/drafts", route => {
    postCalls++;
    return route.fulfill({status: 409, json: {success: false, error: {code: "WORKSHOP_APPLICATION_PENDING", message: "A pending workshop application already exists"}}});
  });
  await context.route("**/api/local/workshop-applications/real-application-id/documents", route => route.fulfill({json: {success: true, data: []}}));
  await reachServices(page); await selectServices(page);
  await page.getByRole("button", {name: "Review details"}).click();
  await expect(page.getByRole("heading", {name: "Application status"})).toBeVisible();
  await expect(page.getByRole("heading", {name: "Documents"})).toBeVisible();
  await expect(page.getByLabel("Tax certificate")).toHaveCount(0);
  expect(mineCalls).toBe(2); expect(postCalls).toBe(1);
});

test("existing rejected application shows status and reason", async ({page, context}) => {
  mineFixture = {success: true, data: [{...application(), status: "REJECTED", rejectionReason: "Missing license"}], meta: {page: 1, limit: 100, total: 1, totalPages: 1}};
  await context.route("**/api/local/workshop-applications/real-application-id/documents", route => route.fulfill({json: {success: true, data: []}}));
  await page.goto("/en/join-as-workshop"); await expect(page.getByText("Your application was rejected", {exact: true})).toBeVisible(); await expect(page.getByText("Missing license", {exact: true})).toBeVisible();
});

test("rejected application stays disabled until missing documents upload and submits once", async ({page, context}) => {
  const documents = ["TAX_CERTIFICATE", "WORKPLACE_LICENSE"].map(type => ({id: `${type}-id`, documentType: type}));
  let submitCount = 0;
  let submitted = false;
  let release!: () => void;
  const submitGate = new Promise<void>(resolve => { release = resolve; });
  await context.route("**/api/local/workshop-applications/mine*", route => {
    const current = {...application(), status: submitted ? "PENDING" : "REJECTED", rejectionReason: "Missing chamber document"};
    return route.fulfill({json: {success: true, data: [current], meta: {page: 1, limit: 100, total: 1, totalPages: 1}}});
  });
  await context.route("**/api/local/workshop-applications/real-application-id/documents", route =>
    route.fulfill({json: {success: true, data: documents}}),
  );
  await context.route("**/api/local/workshop-applications/real-application-id/documents/**", route => {
    const type = route.request().url().split("/").at(-1)!;
    documents.push({id: `${type}-id`, documentType: type});
    return route.fulfill({status: 201, json: {success: true, data: {id: `${type}-id`, documentType: type}}});
  });
  await context.route("**/api/local/workshop-applications/real-application-id/submit", async route => {
    submitCount++;
    await submitGate;
    submitted = true;
    return route.fulfill({json: {success: true, data: application()}});
  });

  await page.goto("/en/join-as-workshop");
  const resubmit = page.getByRole("button", {name: "Resubmit", exact: true});
  await expect(resubmit).toBeDisabled();
  await expect(page.getByText("Complete the required documents before resubmitting.")).toBeVisible();
  await page.getByLabel("Chamber registration").setInputFiles({name: "chamber.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 chamber")});
  await expect(resubmit).toBeEnabled();
  await resubmit.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole("button", {name: "Submitting", exact: true})).toBeDisabled();
  expect(submitCount).toBe(1);
  release();
  await expect(page.getByText("Pending review", {exact: true})).toBeVisible();
});

test("stored required documents enable rejected resubmission without re-upload", async ({page, context}) => {
  const documents = ["TAX_CERTIFICATE", "WORKPLACE_LICENSE", "CHAMBER_REGISTRATION"].map(type => ({id: `${type}-id`, documentType: type}));
  mineFixture = {success: true, data: [{...application(), status: "REJECTED"}], meta: {page: 1, limit: 100, total: 1, totalPages: 1}};
  await context.route("**/api/local/workshop-applications/real-application-id/documents", route => route.fulfill({json: {success: true, data: documents}}));

  await page.goto("/en/join-as-workshop");
  await expect(page.getByRole("button", {name: "Resubmit", exact: true})).toBeEnabled();
  await expect(page.getByText("All required documents have been uploaded.").last()).toBeVisible();
});

for (const [status, label] of [["VERIFIED", "Your application was approved"], ["SUSPENDED", "Business suspended"]] as const) {
  test(`${status} application shows backend status without offering document mutation`, async ({page, context}) => {
    mineFixture = {success: true, data: [{...application(), status}], meta: {page: 1, limit: 100, total: 1, totalPages: 1}};
    await context.route("**/api/local/workshop-applications/real-application-id/documents", route => route.fulfill({json: {success: true, data: []}}));
    await page.goto("/en/join-as-workshop");
    await expect(page.getByText(label, {exact: true})).toBeVisible();
    await expect(page.getByLabel("Tax certificate")).toHaveCount(0);
    await expect(page.getByRole("button", {name: "Upload selected documents"})).toHaveCount(0);
  });
}

test("mine failures show a safe retry without enabling creation", async ({page, context}) => {
  await context.route("**/api/local/workshop-applications/mine*", route => route.fulfill({status: 503, json: {success: false, error: {code: "SERVICE_UNAVAILABLE", message: "private backend detail"}}}));
  await page.goto("/en/join-as-workshop"); await expect(page.getByRole("button", {name: "Try again"})).toBeVisible(); await expect(page.getByText("private backend detail")).toHaveCount(0);
});

test("unverified users cannot open the application form", async ({page, context}) => {
  await context.route("**/api/local/auth/me", route => route.fulfill({json: {success: true, data: {...mockUser, emailVerified: false}}}));
  await page.goto("/en/join-as-workshop"); await expect(page.getByText("You need to verify your email address before applying.")).toBeVisible(); await expect(page.locator("#application-name")).toHaveCount(0);
});

test("workshop owners are directed to the owner panel", async ({page, context}) => {
  await context.route("**/api/local/**", route => {
    if (new URL(route.request().url()).pathname.startsWith("/api/local/auth/")) return route.fallback();
    return route.fulfill({status: 503, json: {success: false, error: {code: "SERVICE_UNAVAILABLE", message: "Panel data is outside this routing test"}}});
  });
  await context.route("**/api/local/auth/me", route => route.fulfill({json: {success: true, data: {...mockUser, roles: ["WORKSHOP_OWNER"]}}}));
  await page.goto("/en/join-as-workshop"); await expect(page).toHaveURL(/\/en\/workshop-panel/);
});

test("mobile phone cleanup, field focus and back navigation preserve the draft", async ({page}) => {
  await page.goto("/en/join-as-workshop");
  await page.locator("#application-name").fill("   ");
  await page.locator("#application-address").fill("Test Street 12");
  const phone = page.locator("#application-phone");
  await expect(phone).toHaveAttribute("inputmode", "numeric");
  await expect(phone).toHaveAttribute("maxlength", "11");
  await phone.evaluate(element => {
    const data = new DataTransfer();
    data.setData("text/plain", "0 (555) abc 123-45-67!89");
    element.dispatchEvent(new ClipboardEvent("paste", {clipboardData: data, bubbles: true, cancelable: true}));
  });
  await expect(phone).toHaveValue("05551234567");
  await page.getByRole("button", {name: "Next", exact: true}).click();
  await expect(page.locator("#application-name")).toBeFocused();
  await page.locator("#application-name").fill("Test Service");
  await phone.fill("02121234567");
  await page.getByRole("button", {name: "Next", exact: true}).click();
  await expect(phone).toBeFocused();
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await phone.fill("05551234567");
  await page.getByRole("button", {name: "Next", exact: true}).click();
  await page.getByRole("button", {name: "Back", exact: true}).click();
  await expect(phone).toHaveValue("05551234567");
  await expect(page.locator("#application-name")).toHaveValue("Test Service");
  await expect(page.locator("#application-address")).toHaveValue("Test Street 12");
});

test("backend businessType issue returns to the localized field without losing data or retrying POST", async ({page}) => {
  let count = 0;
  await page.route("**/api/local/workshop-applications/drafts", async route => {
    count++;
    expect(route.request().postDataJSON()).toMatchObject({phone: "05551234567", businessType: "SAHIS", provinceId: ankara.id, districtId: district.id});
    await route.fulfill({status: 400, json: {success: false, error: {code: "VALIDATION_ERROR", message: "Request validation failed", details: {issues: [{path: "businessType", message: 'Invalid option: expected one of "SAHIS"|"LIMITED"|"ANONIM"'}]}}}});
  });
  await reachServices(page);
  await selectServices(page);
  await page.getByRole("button", {name: "Review details"}).click();
  await expect(page.locator("#application-businessType")).toBeFocused();
  await expect(page.locator("#application-businessType-error")).toHaveText("Select a valid business type.");
  await expect(page.locator("#application-name")).toHaveValue("Test Service");
  await expect(page.getByText(/Invalid option:/)).toHaveCount(0);
  expect(count).toBe(1);
});

test("premium participation card fits tablet and respects reduced motion", async ({page}) => {
  await page.emulateMedia({reducedMotion: "reduce"});
  await page.setViewportSize({width: 768, height: 1024});
  await page.goto("/");
  const card = page.locator(".workshop-join-card");
  await expect(card).toBeVisible();
  await expect(card.locator("li")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(await page.locator(".premium-join-button").first().evaluate(element => getComputedStyle(element, "::before").animationName)).toBe("none");
});
