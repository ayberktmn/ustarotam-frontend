import { QueryClient } from "@tanstack/react-query";

import { ApiError, isApiError } from "@/lib/api/errors";
import { DEFAULT_MAX_RETRY_DELAY_MS } from "@/lib/api/config";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (
            isApiError(error) &&
            error.retryAfterMs !== undefined &&
            error.retryAfterMs > DEFAULT_MAX_RETRY_DELAY_MS
          ) {
            return false;
          }

          if (failureCount >= 2) {
            return false;
          }

          if (isApiError(error)) {
            return error.retryable;
          }

          return true;
        },
        retryDelay: (attemptIndex, error) => {
          if (isApiError(error) && error.retryAfterMs !== undefined) {
            return error.retryAfterMs;
          }

          return Math.min(
            800 * 2 ** attemptIndex,
            DEFAULT_MAX_RETRY_DELAY_MS,
          );
        },
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: undefined,
  });
}

export function isRetryableQueryError(error: unknown): boolean {
  return error instanceof ApiError && error.retryable;
}
