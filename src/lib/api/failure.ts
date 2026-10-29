import {
  ApiError,
  hasErrorName,
  type ApiErrorKind,
} from "@/lib/api/errors";
import { apiFailureSchema } from "@/lib/api/schemas";

const RETRYABLE_SERVER_STATUSES: ReadonlySet<number> = new Set([
  500, 502, 503, 504,
]);

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) {
    return "validation";
  }

  if (status === 401) {
    return "auth";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 404) {
    return "not_found";
  }

  if (status === 409) {
    return "conflict";
  }

  if (status === 429) {
    return "rate_limit";
  }

  if (status >= 500) {
    return "server";
  }

  return "unknown";
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || RETRYABLE_SERVER_STATUSES.has(status);
}

/**
 * `Retry-After` iki biçimi destekler: saniye veya HTTP tarihi. Geçersiz,
 * negatif ve geçmiş değerler `undefined` döner; bu durumda exponential
 * backoff kullanılır. Sıfır geçerli bir saniye değeridir.
 */
export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);

    if (!Number.isSafeInteger(seconds)) {
      return undefined;
    }

    return seconds * 1000;
  }

  const date = Date.parse(trimmed);

  if (Number.isNaN(date)) {
    return undefined;
  }

  const delay = date - Date.now();

  return delay > 0 ? delay : undefined;
}

export async function readJsonResponse(
  response: Response,
  requestId: string,
): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (!hasErrorName(error, "SyntaxError")) {
      throw error;
    }

    throw new ApiError({
      kind: "contract",
      message: "Response body is not valid JSON.",
      status: response.status,
      code: "INVALID_RESPONSE_JSON",
      requestId,
      retryable: false,
    });
  }
}

export async function parseFailureResponse(
  response: Response,
  requestId: string,
): Promise<ApiError> {
  let body: unknown = null;

  try {
    body = await response.json();
  } catch (error) {
    if (hasErrorName(error, "AbortError")) {
      throw error;
    }

    body = null;
  }

  const parsed = apiFailureSchema.safeParse(body);
  const code = parsed.success ? parsed.data.error.code : undefined;
  const message = parsed.success
    ? parsed.data.error.message
    : `HTTP ${response.status}`;
  const details = parsed.success
    ? parsed.data.error.details ?? (
        parsed.data.error.retryAfterSeconds !== undefined || parsed.data.error.retryAt
          ? {
              retryAfterSeconds: parsed.data.error.retryAfterSeconds,
              retryAt: parsed.data.error.retryAt,
            }
          : undefined
      )
    : undefined;
  const retryable = isRetryableStatus(response.status);

  return new ApiError({
    kind: kindForStatus(response.status),
    message,
    status: response.status,
    code,
    details,
    requestId,
    retryAfterMs: retryable
      ? parseRetryAfter(response.headers.get("retry-after"))
      : undefined,
    retryable,
  });
}
