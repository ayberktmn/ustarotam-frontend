export const COOKIE_CONSENT_KEY = "ustarotam_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;
export const OPEN_COOKIE_PREFERENCES_EVENT = "ustarotam:open-cookie-preferences";

export interface CookieConsentPreferences {
  version: typeof COOKIE_CONSENT_VERSION;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export function parseCookieConsent(value: string | null): CookieConsentPreferences | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.version !== COOKIE_CONSENT_VERSION ||
      candidate.necessary !== true ||
      typeof candidate.analytics !== "boolean" ||
      typeof candidate.marketing !== "boolean" ||
      typeof candidate.updatedAt !== "string"
    ) return null;
    return candidate as unknown as CookieConsentPreferences;
  } catch {
    return null;
  }
}

export function createCookieConsent(analytics: boolean, marketing: boolean): CookieConsentPreferences {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics,
    marketing,
    updatedAt: new Date().toISOString(),
  };
}
