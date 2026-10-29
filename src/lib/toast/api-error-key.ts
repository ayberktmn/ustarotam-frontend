import { ApiError, isApiError } from "@/lib/api/errors";

export type ApiErrorMessageKey =
  | "network"
  | "timeout"
  | "unauthorized"
  | "sessionExpired"
  | "forbidden"
  | "notFound"
  | "validation"
  | "conflict"
  | "rateLimited"
  | "server"
  | "contract"
  | "invalidCredentials"
  | "emailNotVerified"
  | "emailDeliveryFailed"
  | "registrationUnavailable"
  | "authNotConfigured"
  | "missingAccessToken"
  | "verificationInvalid"
  | "emailChangeUnavailable"
  | "emailChangeVerificationRequired"
  | "unknown";

const codeMap: Record<string, ApiErrorMessageKey> = {
  EMAIL_CHANGE_RATE_LIMITED: "rateLimited",
  INVALID_EMAIL_CHANGE_CODE: "verificationInvalid",
  EMAIL_CHANGE_UNAVAILABLE: "emailChangeUnavailable",
  EMAIL_CHANGE_VERIFICATION_REQUIRED: "emailChangeVerificationRequired",
  INVALID_VERIFICATION_TOKEN: "verificationInvalid",
  INVALID_CREDENTIALS: "invalidCredentials",
  EMAIL_NOT_VERIFIED: "emailNotVerified",
  EMAIL_DELIVERY_FAILED: "emailDeliveryFailed",
  AUTH_RATE_LIMITED: "rateLimited",
  REGISTRATION_UNAVAILABLE: "registrationUnavailable",
  AUTH_NOT_CONFIGURED: "authNotConfigured",
  VALIDATION_ERROR: "validation",
  CONSENT_REQUIRED: "validation",
  INVALID_PROVINCE: "validation",
  PROFILE_UPDATE_UNAVAILABLE: "conflict",
  AUTHENTICATION_REQUIRED: "unauthorized",
  INVALID_ACCESS_TOKEN: "unauthorized",
  INVALID_REFRESH_TOKEN: "sessionExpired",
  SESSION_EXPIRED: "sessionExpired",
  MISSING_ACCESS_TOKEN: "missingAccessToken",
  FORBIDDEN: "forbidden",
  WORKSHOP_OWNER_REQUIRED: "forbidden",
  WORKSHOP_NOT_FOUND: "notFound",
  NOT_FOUND: "notFound",
  PROVINCE_NOT_FOUND: "notFound",
  DISTRICT_NOT_FOUND: "notFound",
  VEHICLE_BRAND_NOT_FOUND: "notFound",
  VEHICLE_TYPE_NOT_FOUND: "notFound",
  INVALID_LOCATION_RELATION: "validation",
  INVALID_JSON: "validation",
};

export function getApiErrorMessageKey(
  error: unknown,
): ApiErrorMessageKey {
  if (!isApiError(error)) {
    return "unknown";
  }

  if (error.code && codeMap[error.code]) {
    return codeMap[error.code];
  }

  if (error.kind === "network") return "network";
  if (error.kind === "timeout") return "timeout";
  if (error.kind === "auth") return "unauthorized";
  if (error.kind === "forbidden") return "forbidden";
  if (error.kind === "not_found") return "notFound";
  if (error.kind === "validation") return "validation";
  if (error.kind === "conflict") return "conflict";
  if (error.kind === "rate_limit") return "rateLimited";
  if (error.kind === "server") return "server";
  if (error.kind === "contract") return "contract";

  if (error.status === 401) return "unauthorized";
  if (error.status === 403) return "forbidden";
  if (error.status === 404) return "notFound";
  if (error.status === 409) return "conflict";
  if (error.status === 429) return "rateLimited";
  if (error.status && error.status >= 500) return "server";

  return "unknown";
}

export function isApiErrorInstance(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
