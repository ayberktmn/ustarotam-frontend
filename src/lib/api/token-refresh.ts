import { z } from "zod";

import {
  DEFAULT_API_TIMEOUT_MS,
  getBrowserApiBaseUrl,
} from "@/lib/api/config";
import {
  ApiError,
  createCancelledError,
  isApiError,
  toApiError,
} from "@/lib/api/errors";
import {
  parseFailureResponse,
  readJsonResponse,
} from "@/lib/api/failure";
import { createRequestId } from "@/lib/api/request-id";
import { apiSuccessSchema } from "@/lib/api/schemas";
import { clearAccessToken, setAccessToken, getSessionSignal, isSignedOut } from "@/lib/api/token-store";

const refreshPayloadSchema = z
  .object({
    accessToken: z.string().min(1).optional(),
  })
  .passthrough();

const refreshResponseSchema = apiSuccessSchema(refreshPayloadSchema);

const EXPIRED_REFRESH_CODES: ReadonlySet<string> = new Set([
  "INVALID_REFRESH_TOKEN",
  "SESSION_EXPIRED",
  "REFRESH_TOKEN_MISSING",
]);

export type TokenRefreshResult =
  | { status: "refreshed" }
  | { status: "expired"; error: ApiError }
  | { status: "unavailable"; error: ApiError };

let refreshPromise: Promise<TokenRefreshResult> | null = null;

function isExpiredRefreshError(error: ApiError): boolean {
  if (error.status === 401 || error.status === 403) {
    return true;
  }

  return Boolean(error.code && EXPIRED_REFRESH_CODES.has(error.code));
}

function unavailable(error: ApiError): TokenRefreshResult {
  return { status: "unavailable", error };
}

async function performRefresh(sessionSignal: AbortSignal): Promise<TokenRefreshResult> {
  if (sessionSignal.aborted || isSignedOut()) return unavailable(createCancelledError());
  if (typeof window === "undefined") {
    return unavailable(
      new ApiError({
        kind: "unknown",
        message: "Token refresh is only available in the browser.",
        retryable: false,
      }),
    );
  }

  const requestId = createRequestId();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DEFAULT_API_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `${getBrowserApiBaseUrl()}/auth/refresh`,
      {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",

        },
        signal: AbortSignal.any([controller.signal, sessionSignal]),
      },
    );

    if (sessionSignal.aborted) return unavailable(createCancelledError());
    if (!response.ok) {
      const error = await parseFailureResponse(response, requestId);
      if (sessionSignal.aborted) return unavailable(createCancelledError());

      if (isExpiredRefreshError(error)) {
        clearAccessToken();
        return { status: "expired", error };
      }

      return unavailable(error);
    }

    const json = await readJsonResponse(response, requestId);
    const parsed = refreshResponseSchema.safeParse(json);

    if (!parsed.success) {
      return unavailable(
        new ApiError({
          kind: "contract",
          message: "Refresh response did not match the expected schema.",
          status: response.status,
          requestId,
          details: parsed.error.flatten(),
          retryable: false,
        }),
      );
    }

    const token = parsed.data.data.accessToken ?? null;

    if (!token) {
      return unavailable(
        new ApiError({
          kind: "contract",
          message: "Refresh response did not include an access token.",
          status: response.status,
          code: "MISSING_ACCESS_TOKEN",
          requestId,
          retryable: false,
        }),
      );
    }

    if (sessionSignal.aborted) return unavailable(createCancelledError());
    setAccessToken(token);

    return { status: "refreshed" };
  } catch (error) {
    if (sessionSignal.aborted) return unavailable(createCancelledError());
    if (isApiError(error)) {
      return unavailable(error);
    }

    if (controller.signal.aborted) {
      return unavailable(
        new ApiError({
          kind: "timeout",
          message: "Token refresh timed out.",
          requestId,
          retryable: true,
        }),
      );
    }

    return unavailable(
      new ApiError({
        kind: "network",
        message:
          error instanceof Error
            ? error.message
            : "Token refresh request failed.",
        requestId,
        retryable: true,
      }),
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Aynı anda birden fazla 401 geldiğinde tek bir refresh isteği çalıştırır.
 * Sonuç her zaman normalize edilmiş bir `TokenRefreshResult` olur; bu fonksiyon
 * reject etmez.
 */
export function refreshAccessToken(): Promise<TokenRefreshResult> {
  if (isSignedOut()) return Promise.resolve(unavailable(createCancelledError()));
  if (!refreshPromise) {
    refreshPromise = performLockedRefresh()
      .catch((error: unknown) =>
        unavailable(toApiError(error)),
      )
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function performLockedRefresh(): Promise<TokenRefreshResult> {
  const sessionSignal = getSessionSignal();
  return withSessionLock(() => performRefresh(sessionSignal));
}

let sessionQueue: Promise<void> = Promise.resolve();

export async function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return await navigator.locks.request("usta-rotam-session", operation);
  }
  const queued = sessionQueue.then(operation, operation);
  sessionQueue = queued.then(() => undefined, () => undefined);
  return queued;
}
