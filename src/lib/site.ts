import "server-only";

export const siteConfig = {
  name: "Usta Rotam",
  shortName: "Usta Rotam",
  tagline: "Aracına doğru ustayı bul.",
  description:
    "Usta Rotam, araç sahiplerinin şehir, ilçe ve uzmanlık alanına göre oto tamir ustalarını ve servis işletmelerini bulmasına yardımcı olan bir platformdur.",
  locale: "tr_TR",
} as const;

export const defaultOpenGraphImage = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Usta Rotam",
} as const;

const FALLBACK_SITE_URL = "http://localhost:3000";

/**
 * Canonical URL tabanı. Üretimde `SITE_URL` ortam değişkeni ile
 * yapılandırılır. Geçersiz veya eksik değerde yerel geliştirme adresine
 * döner; böylece metadata üretimi build sırasında kırılmaz.
 */
export function getSiteUrl(): string {
  const value = process.env.SITE_URL?.trim();

  if (!value) {
    return FALLBACK_SITE_URL;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return FALLBACK_SITE_URL;
    }

    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}
