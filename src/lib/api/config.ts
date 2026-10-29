export const DEFAULT_API_TIMEOUT_MS = 12_000;
export const DEFAULT_GET_RETRIES = 2;
export const DEFAULT_MAX_RETRY_DELAY_MS = 5_000;
export const FALLBACK_API_BASE_URL = "https://api.ustarotam.com/api/v1";


function trimTrailingSlash(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback(url.hostname)))) {
    throw new Error("API base URL must use HTTPS (HTTP is allowed only on loopback).");
  }
  return url.toString().replace(/\/+$/, "");
}

function isLoopback(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

export function getBrowserApiBaseUrl(): string {
  // The existing development gateway bridges the backend's Secure/Strict
  // cookie on localhost. Hosted sites consume the backend directly.
  if (typeof window !== "undefined" && isLoopback(window.location?.hostname ?? "")) return "/api/local";
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_API_BASE_URL ||
      (process.env.NODE_ENV === "production"
        ? missingProductionBaseUrl()
        : FALLBACK_API_BASE_URL),
  );
}

export function getServerApiBaseUrl(): string {
  return trimTrailingSlash(
    process.env.API_INTERNAL_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      (process.env.NODE_ENV === "production"
        ? missingProductionBaseUrl()
        : FALLBACK_API_BASE_URL),
  );
}

function missingProductionBaseUrl(): never {
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured in production.");
}
