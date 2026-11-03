"use client";

import { useTranslations } from "next-intl";

import { OPEN_COOKIE_PREFERENCES_EVENT } from "@/lib/cookie-consent";

export function CookiePreferencesLink() {
  const t = useTranslations("footer");
  return <button type="button" className="text-left text-sm text-white/65 transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-brand/50 focus-visible:outline-none" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))}>{t("cookiePreferences")}</button>;
}
