import { describe, expect, it, vi } from "vitest";

import { COOKIE_CONSENT_VERSION, createCookieConsent, parseCookieConsent } from "@/lib/cookie-consent";

describe("cookie consent storage contract", () => {
  it("keeps necessary cookies active and optional categories explicit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T12:00:00.000Z"));
    expect(createCookieConsent(false, false)).toEqual({version: COOKIE_CONSENT_VERSION, necessary: true, analytics: false, marketing: false, updatedAt: "2026-11-03T12:00:00.000Z"});
    vi.useRealTimers();
  });

  it("accepts only the current complete preference contract", () => {
    const valid = JSON.stringify({version: COOKIE_CONSENT_VERSION, necessary: true, analytics: true, marketing: false, updatedAt: "2026-11-03T12:00:00.000Z"});
    expect(parseCookieConsent(valid)?.analytics).toBe(true);
    expect(parseCookieConsent(null)).toBeNull();
    expect(parseCookieConsent("not-json")).toBeNull();
    expect(parseCookieConsent(JSON.stringify({version: 0, necessary: true, analytics: true, marketing: true, updatedAt: "x"}))).toBeNull();
    expect(parseCookieConsent(JSON.stringify({version: COOKIE_CONSENT_VERSION, necessary: false, analytics: false, marketing: false, updatedAt: "x"}))).toBeNull();
  });
});
