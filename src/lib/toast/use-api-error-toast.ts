"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getApiErrorMessageKey } from "@/lib/toast/api-error-key";
import { isApiError } from "@/lib/api/errors";

interface ApiErrorToastOptions {
  id?: string;
  onRetry?: () => void;
}

export function useApiErrorToast() {
  const t = useTranslations("errors");
  const common = useTranslations("common");

  return (error: unknown, options?: ApiErrorToastOptions) => {
    if (isApiError(error) && error.code === "REQUEST_CANCELLED") return;
    toast.error(t(getApiErrorMessageKey(error)), {
      id: options?.id,
      action: options?.onRetry
        ? {
            label: common("retry"),
            onClick: options.onRetry,
          }
        : undefined,
    });
  };
}
