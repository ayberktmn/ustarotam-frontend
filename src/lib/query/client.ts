import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

import { ApiError, isApiError } from "@/lib/api/errors";
import { DEFAULT_MAX_RETRY_DELAY_MS } from "@/lib/api/config";

function reportApiError(scope: string, error: unknown): void {
  const safeError = isApiError(error)
    ? {
        kind: error.kind,
        status: error.status,
        code: error.code,
        requestId: error.requestId,
        message: error.message,
      }
    : { message: error instanceof Error ? error.message : "Unknown error" };

  console.error(`[UstaRotam] ${scope}`, safeError);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => reportApiError("Query failed", error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => reportApiError("Mutation failed", error),
    }),
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
  });
}

export function isRetryableQueryError(error: unknown): boolean {
  return error instanceof ApiError && error.retryable;
}
