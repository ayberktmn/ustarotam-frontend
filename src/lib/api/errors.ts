export type ApiErrorKind =
  | "network"
  | "timeout"
  | "auth"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limit"
  | "server"
  | "contract"
  | "unknown";

export interface ApiErrorOptions {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
  requestId?: string;
  retryAfterMs?: number;
  retryable?: boolean;
}

const retryableKinds: ReadonlySet<ApiErrorKind> = new Set([
  "network",
  "timeout",
  "rate_limit",
  "server",
]);

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly retryAfterMs?: number;
  readonly retryable: boolean;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
    this.retryAfterMs = options.retryAfterMs;
    this.retryable =
      options.retryable ?? retryableKinds.has(options.kind);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function hasErrorName(error: unknown, name: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === name
  );
}

export function createCancelledError(requestId?: string): ApiError {
  return new ApiError({
    kind: "unknown",
    message: "Request was cancelled.",
    code: "REQUEST_CANCELLED",
    requestId,
    retryable: false,
  });
}

export function withRequestId(
  error: ApiError,
  requestId: string,
): ApiError {
  if (error.requestId === requestId) {
    return error;
  }

  return new ApiError({
    kind: error.kind,
    message: error.message,
    status: error.status,
    code: error.code,
    details: error.details,
    requestId,
    retryAfterMs: error.retryAfterMs,
    retryable: error.retryable,
  });
}

export function toApiError(
  error: unknown,
  requestId?: string,
): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError({
      kind: "unknown",
      message: error.message,
      requestId,
    });
  }

  return new ApiError({
    kind: "unknown",
    message: "Unknown API error",
    requestId,
  });
}
