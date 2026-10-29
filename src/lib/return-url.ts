const AUTH_PATHS = new Set([
  "/giris",
  "/kayit",
  "/login",
  "/register",
  "/sifremi-unuttum",
  "/sifre-sifirla",
  "/sifremi-sifirla",
  "/forgot-password",
  "/reset-password",
  "/en/login",
  "/en/register",
  "/en/forgot-password",
  "/en/reset-password",
  "/tr/giris",
  "/tr/kayit",
]);

/**
 * Yalnızca uygulama içi göreli yolları kabul eder. Protokol, alan adı ve
 * auth sayfalarına dönüş engellenir.
 */
export function sanitizeReturnUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();

  if (
    !trimmed ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return null;
  }

  const pathname = trimmed.split("?")[0];

  if (AUTH_PATHS.has(pathname)) {
    return null;
  }

  return trimmed;
}

export function readReturnUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sanitizeReturnUrl(
    new URLSearchParams(window.location.search).get("returnUrl"),
  );
}
