import { DEFAULT_MAX_RETRY_DELAY_MS } from "@/lib/api/config";
import { createCancelledError } from "@/lib/api/errors";

/**
 * Sunucunun istediği bekleme süresi istemci limitini aşıyorsa otomatik retry
 * yapılmaz; `null` dönerek çağırana hata bırakılır. Böylece sunucudan erken
 * tekrar isteği gönderilmez.
 */
export function resolveRetryDelay(
  attempt: number,
  retryAfterMs?: number,
): number | null {
  if (retryAfterMs !== undefined) {
    if (Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
      return retryAfterMs > DEFAULT_MAX_RETRY_DELAY_MS
        ? null
        : retryAfterMs;
    }
  }

  const base = Math.min(500 * 2 ** attempt, DEFAULT_MAX_RETRY_DELAY_MS);
  const jitter = 0.8 + Math.random() * 0.4;

  return Math.min(
    Math.round(base * jitter),
    DEFAULT_MAX_RETRY_DELAY_MS,
  );
}

export function sleepWithSignal(
  ms: number,
  signal?: AbortSignal,
  requestId?: string,
): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(createCancelledError(requestId));
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
    }

    function finish() {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
    }

    function handleAbort() {
      finish();
      reject(createCancelledError(requestId));
    }

    const timer = setTimeout(() => {
      finish();
      resolve();
    }, ms);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}
