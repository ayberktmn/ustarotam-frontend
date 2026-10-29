import type { z } from "zod";

import {
  DEFAULT_API_TIMEOUT_MS,
  DEFAULT_GET_RETRIES,
  getBrowserApiBaseUrl,
  getServerApiBaseUrl,
} from "@/lib/api/config";
import {
  ApiError,
  createCancelledError,
  hasErrorName,
  isApiError,
  toApiError,
  withRequestId,
} from "@/lib/api/errors";
import { emitSessionExpired } from "@/lib/api/events";
import {
  parseFailureResponse,
  readJsonResponse,
} from "@/lib/api/failure";
import { createRequestId } from "@/lib/api/request-id";
import { resolveRetryDelay, sleepWithSignal } from "@/lib/api/retry";
import { apiFailureSchema } from "@/lib/api/schemas";
import {
  refreshAccessToken,
  type TokenRefreshResult,
} from "@/lib/api/token-refresh";
import { clearAccessToken, getAccessToken, getSessionSignal } from "@/lib/api/token-store";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type AuthMode = "none" | "optional" | "required";

type ResponseMode = "envelope" | "raw";

export interface NextFetchOptions {
  revalidate?: number | false;
  tags?: string[];
}

export interface ApiRequestOptions<T> {
  path: string;
  schema: z.ZodType<T>;
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  binaryBody?: Blob;
  /**
   * Access token ekleme ve otomatik refresh politikası.
   * - `none`: otomatik bearer token ve refresh yok. Cookie'ler `credentials`
   *   ayarına göre gönderilir.
   * - `optional` (varsayılan): token varsa eklenir, 401'de bir kez refresh
   *   denenir. Anonim isteklerde oturum bitince event üretilmez.
   * - `required`: token yoksa önce refresh denenir; oturum kesin bittiyse
   *   session-expired event'i üretilir.
   *
   * Caller'ın verdiği `Authorization` header'ı `none` modunda korunur; diğer
   * modlarda mevcut access token varsa otomatik bearer değeri kullanılır.
   */
  auth?: AuthMode;
  /**
   * Varsayılan: browser için `include`, server için `same-origin`.
   * Cookie gerektirmeyen tamamen anonim istekler için `omit` verilebilir.
   */
  credentials?: RequestCredentials;
  responseMode?: ResponseMode;
  retries?: number;
  timeoutMs?: number;
  locale?: string;
  signal?: AbortSignal;
  cache?: RequestCache;
  next?: NextFetchOptions;
  headers?: HeadersInit;
}

export type ApiRequestFn = <T>(
  options: ApiRequestOptions<T>,
) => Promise<T>;

interface RequestContext<T> {
  options: ApiRequestOptions<T>;
  mode: "browser" | "server";
  requestId: string;
  authMode: AuthMode;
}

const safeMethods: ReadonlySet<HttpMethod> = new Set(["GET"]);

function buildQuery(
  query: ApiRequestOptions<unknown>["query"],
): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function createTimeoutSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal,
): {
  signal: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  function abortFromExternal() {
    controller.abort();
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", abortFromExternal, {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromExternal);
    },
    didTimeout: () => timedOut,
  };
}

async function performRequest<T>({
  options,
  mode,
  requestId,
  authMode,
}: RequestContext<T>): Promise<T> {
  const baseUrl =
    mode === "browser" ? getBrowserApiBaseUrl() : getServerApiBaseUrl();
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  const token =
    mode === "browser" && authMode !== "none" ? getAccessToken() : null;

  headers.set("Accept", "application/json");


  if (options.locale) {
    headers.set("Accept-Language", options.locale);
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const hasBody = options.body !== undefined && method !== "GET";
  let body: BodyInit | undefined;

  if (options.binaryBody && method !== "GET") {
    headers.set("Content-Type", options.binaryBody.type);
    body = options.binaryBody;
  } else if (hasBody) {
    headers.set("Content-Type", "application/json");

    try {
      const serialized = JSON.stringify(options.body);

      if (serialized === undefined) {
        throw new TypeError("Request body could not be serialized.");
      }

      body = serialized;
    } catch {
      throw new ApiError({
        kind: "contract",
        message: "Request body could not be serialized as JSON.",
        code: "REQUEST_BODY_SERIALIZATION_FAILED",
        requestId,
        retryable: false,
      });
    }
  }

  const timeout = createTimeoutSignal(
    options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
    options.signal,
  );

  const fetchOptions: RequestInit & { next?: NextFetchOptions } = {
    method,
    headers,
    body,
    signal: timeout.signal,
    credentials:
      options.credentials ??
      (mode === "browser" ? "include" : "same-origin"),
  };

  if (mode === "server" && options.next) {
    fetchOptions.next = options.next;
  } else if (mode === "browser" || method !== "GET") {
    fetchOptions.cache = options.cache ?? "no-store";
  } else {
    fetchOptions.cache = options.cache;
  }

  try {
    const response = await fetch(
      `${baseUrl}${options.path}${buildQuery(options.query)}`,
      fetchOptions,
    );

    if (response.status === 204) {
      const parsed = options.schema.safeParse(undefined);

      if (!parsed.success) {
        throw new ApiError({
          kind: "contract",
          message: "Empty response did not match the expected schema.",
          status: response.status,
          requestId,
        });
      }

      return parsed.data;
    }

    if (!response.ok) {
      throw await parseFailureResponse(response, requestId);
    }

    const json: unknown = await readJsonResponse(response, requestId);

    if (options.responseMode === "raw") {
      const parsed = options.schema.safeParse(json);

      if (!parsed.success) {
        throw new ApiError({
          kind: "contract",
          message: "Response did not match the expected schema.",
          status: response.status,
          requestId,
          details: parsed.error.flatten(),
        });
      }

      return parsed.data;
    }

    const failure = apiFailureSchema.safeParse(json);

    if (failure.success) {
      throw new ApiError({
        kind: "unknown",
        message: failure.data.error.message,
        status: response.status,
        code: failure.data.error.code,
        details: failure.data.error.details,
        requestId,
      });
    }

    if (
      typeof json !== "object" ||
      json === null ||
      !("success" in json) ||
      json.success !== true ||
      !("data" in json)
    ) {
      throw new ApiError({
        kind: "contract",
        message: "Response envelope is invalid.",
        status: response.status,
        requestId,
        details: {
          receivedType: typeof json,
          hasSuccess:
            typeof json === "object" && json !== null && "success" in json,
          hasData:
            typeof json === "object" && json !== null && "data" in json,
        },
        retryable: false,
      });
    }

    const parsed = options.schema.safeParse(json.data);

    if (!parsed.success) {
      throw new ApiError({
        kind: "contract",
        message: "Response data did not match the expected schema.",
        status: response.status,
        requestId,
        details: parsed.error.flatten(),
      });
    }

    return parsed.data;
  } catch (error) {
    if (isApiError(error)) {
      throw error;
    }

    if (timeout.didTimeout()) {
      throw new ApiError({
        kind: "timeout",
        message: "Request timed out.",
        requestId,
        retryable: true,
      });
    }

    if (
      options.signal?.aborted ||
      hasErrorName(error, "AbortError")
    ) {
      throw createCancelledError(requestId);
    }

    throw new ApiError({
      kind: "network",
      message:
        error instanceof Error ? error.message : "Network request failed.",
      requestId,
      retryable: true,
    });
  } finally {
    timeout.cleanup();
  }
}

function createSessionExpiredError(requestId: string): ApiError {
  return new ApiError({
    kind: "auth",
    message: "Session expired.",
    status: 401,
    code: "SESSION_EXPIRED",
    requestId,
    retryable: false,
  });
}

async function runRefresh(requestId: string): Promise<TokenRefreshResult> {
  try {
    return await refreshAccessToken();
  } catch (error) {
    return {
      status: "unavailable",
      error: withRequestId(toApiError(error), requestId),
    };
  }
}

async function execute<T>(
  options: ApiRequestOptions<T>,
  mode: "browser" | "server",
): Promise<T> {
  const requestId = createRequestId();
  const method = options.method ?? "GET";
  const authMode: AuthMode = options.auth ?? "optional";
  const retries =
    options.retries ??
    (safeMethods.has(method) ? DEFAULT_GET_RETRIES : 0);
  const canRefresh = mode === "browser" && authMode !== "none";
  let authRetried = false;
  let attempt = 0;

  if (options.signal?.aborted) {
    throw createCancelledError(requestId);
  }

  if (canRefresh && authMode === "required" && !getAccessToken()) {
    authRetried = true;

    const result = await runRefresh(requestId);

    if (options.signal?.aborted) {
      throw createCancelledError(requestId);
    }

    if (result.status === "expired") {
      emitSessionExpired();
      throw createSessionExpiredError(requestId);
    }

    if (result.status === "unavailable") {
      throw withRequestId(result.error, requestId);
    }

    if (!getAccessToken()) {
      throw new ApiError({
        kind: "contract",
        message: "Token refresh did not produce an access token.",
        code: "MISSING_ACCESS_TOKEN",
        requestId,
        retryable: false,
      });
    }
  }

  if (options.signal?.aborted) {
    throw createCancelledError(requestId);
  }

  for (;;) {
    if (options.signal?.aborted) {
      throw createCancelledError(requestId);
    }

    const attemptedToken = mode === "browser" ? getAccessToken() : null;
    try {
      return await performRequest({ options, mode, requestId, authMode });
    } catch (error) {
      const apiError = isApiError(error)
        ? error
        : toApiError(error, requestId);

      if (options.signal?.aborted) throw createCancelledError(requestId);

      if (canRefresh && apiError.status === 401) {
        if (authRetried) {
          clearAccessToken();

          if (authMode === "required") {
            emitSessionExpired();
            throw createSessionExpiredError(requestId);
          }

          throw apiError;
        }

        authRetried = true;

        // Another request may have finished refreshing while this old-token
        // response was in flight. Reuse its token instead of rotating again.
        if (getAccessToken() && getAccessToken() !== attemptedToken) {
          continue;
        }

        const result = await runRefresh(requestId);

        if (options.signal?.aborted) {
          throw createCancelledError(requestId);
        }

        if (result.status === "refreshed") {
          continue;
        }

        if (result.status === "expired") {
          if (authMode === "required") {
            emitSessionExpired();
            throw createSessionExpiredError(requestId);
          }

          throw apiError;
        }

        throw withRequestId(result.error, requestId);
      }

      if (options.signal?.aborted) {
        throw createCancelledError(requestId);
      }

      if (
        safeMethods.has(method) &&
        attempt < retries &&
        apiError.retryable
      ) {
        const delay = resolveRetryDelay(attempt, apiError.retryAfterMs);

        if (delay === null) {
          throw apiError;
        }

        await sleepWithSignal(delay, options.signal, requestId);
        attempt += 1;
        continue;
      }

      throw apiError;
    }
  }
}

export async function browserRequest<T>(
  options: ApiRequestOptions<T>,
): Promise<T> {
  // Logout must finish revoking the cookie; earlier requests lose their session.
  if (options.path === "/auth/logout" ||
      (options.auth === "none" && !options.path.startsWith("/auth/"))) {
    return execute(options, "browser");
  }
  const sessionSignal = getSessionSignal();
  const signal = options.signal
    ? AbortSignal.any([options.signal, sessionSignal])
    : sessionSignal;
  try {
    const result = await execute({ ...options, signal }, "browser");
    if (signal.aborted) throw createCancelledError();
    return result;
  } catch (error) {
    if (signal.aborted) throw createCancelledError();
    throw error;
  }
}

export function serverRequest<T>(
  options: ApiRequestOptions<T>,
): Promise<T> {
  return execute({ ...options, auth: "none" }, "server");
}
