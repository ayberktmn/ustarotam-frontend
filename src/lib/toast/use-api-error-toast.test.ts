import { expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, createCancelledError } from "@/lib/api/errors";
import { useApiErrorToast } from "./use-api-error-toast";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

it("does not show a login or refresh error invalidated by logout", () => {
  const showError = useApiErrorToast();
  showError(createCancelledError(), {id: "login-error"});
  showError(createCancelledError(), {id: "session-expired"});
  expect(toast.error).not.toHaveBeenCalled();
});

it("continues showing genuine login validation errors", () => {
  useApiErrorToast()(new ApiError({kind: "validation", code: "VALIDATION_ERROR", message: "test"}), {id: "login-error"});
  expect(toast.error).toHaveBeenCalledWith("validation", expect.objectContaining({id: "login-error"}));
});
