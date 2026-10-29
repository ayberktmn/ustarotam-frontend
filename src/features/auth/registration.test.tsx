import { expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { filterProvinces, ProvinceSelect } from "./province-select";
import { passwordIsValid, nameIsValid, phoneIsValid, emailIsValid } from "./registration-validation";
import messages from "../../../messages/en.json";
import { authPanelPath } from "./panel-path";

const items = [{id: "34", name: "İstanbul"}, {id: "35", name: "İzmir"}, {id: "6", name: "Ankara"}];
it("routes by roles supplied by the backend without inventing owner privileges", () => {
  expect(authPanelPath({roles: ["USER"]})).toBe("/hesabim");
  expect(authPanelPath({roles: ["USER", "WORKSHOP_OWNER"]})).toBe("/usta-panel");
  expect(authPanelPath({roles: ["ADMIN"]})).toBe("/hesabim");
});
it("filters Turkish province names without case sensitivity", () => {
  expect(filterProvinces(items, "  İZMİR ")).toEqual([items[1]]);
  expect(filterProvinces(items, "missing")).toEqual([]);
  expect(filterProvinces(items, "")).toHaveLength(3);
});
it("renders a closed combobox without an external search field independently of passwords", () => {
  const provinces = Array.from({length: 81}, (_, i) => ({id: String(i), name: `Province ${i}`}));
  const html = renderToStaticMarkup(<NextIntlClientProvider locale="en" messages={messages}><ProvinceSelect items={provinces} value="6" onChange={() => {}} disabled={false} invalid={false} /></NextIntlClientProvider>);
  expect(html).toContain('role="combobox"');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('value="6"');
  expect(html).not.toContain('disabled=""');
  expect(html).not.toContain('aria-autocomplete="list"');
  expect(html).not.toContain("<select");
});
it("matches backend name, phone and password constraints", () => {
  expect(nameIsValid(" A ")).toBe(false);
  expect(nameIsValid("Ankara")).toBe(true);
  expect(nameIsValid("a".repeat(101))).toBe(false);
  expect(phoneIsValid("")).toBe(true);
  expect(phoneIsValid("123")).toBe(false);
  expect(phoneIsValid("+905551234567")).toBe(true);
  expect(passwordIsValid("ValidPassword1!")).toBe(true);
  expect(passwordIsValid("password123456")).toBe(false);
  expect(passwordIsValid("Aa1!" + "x".repeat(125))).toBe(false);
  expect(emailIsValid(" test@example.test ")).toBe(true);
  expect(emailIsValid("invalid@address")).toBe(false);
  expect(emailIsValid("a".repeat(310) + "@example.test")).toBe(false);
  expect(passwordIsValid("ValidPassword1 ")).toBe(true);
});
