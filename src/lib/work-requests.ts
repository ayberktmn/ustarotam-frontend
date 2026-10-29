import { z } from "zod";

import { isApiError } from "@/lib/api/errors";
import type { WorkRequestStatus } from "@/types/work-request";

export const MODEL_NOT_LISTED_VALUE = "__model-not-listed__";

const requestFormSchema = z.object({
  vehicleTypeId: z.string().uuid(),
  vehicleBrandId: z.string().uuid().nullable(),
  vehicleModelId: z.string().uuid().nullable(),
  specialtyId: z.string().uuid(),
  provinceId: z.string().uuid(),
  districtId: z.string().uuid(),
  address: z.string().trim().min(5).max(500),
  description: z.string().trim().min(5).max(5000),
});

export type WorkRequestFormValues = z.input<typeof requestFormSchema>;
export type WorkRequestFormField = keyof WorkRequestFormValues;

const cancellationStatuses: ReadonlySet<WorkRequestStatus> = new Set([
  "DRAFT",
  "PUBLISHED",
  "ASSIGNED",
]);

export function canCancelWorkRequest(status: WorkRequestStatus): boolean {
  return cancellationStatuses.has(status);
}

export function normalizeVehicleModelSelection(value: string): string | null {
  return value && value !== MODEL_NOT_LISTED_VALUE ? value : null;
}

export function validateWorkRequestForm(values: WorkRequestFormValues): {
  data?: z.output<typeof requestFormSchema>;
  errors: Partial<Record<WorkRequestFormField, string>>;
} {
  const result = requestFormSchema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };

  const errors: Partial<Record<WorkRequestFormField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in values && !errors[field as WorkRequestFormField]) {
      errors[field as WorkRequestFormField] = "invalid";
    }
  }
  return { errors };
}

export function getWorkRequestApiFieldErrors(
  error: unknown,
): Partial<Record<WorkRequestFormField, string>> {
  if (!isApiError(error) || error.code !== "VALIDATION_ERROR") return {};
  const details = z.object({
    issues: z.array(z.object({
      path: z.string(),
    }).passthrough()),
  }).passthrough().safeParse(error.details);
  if (!details.success) return {};

  const errors: Partial<Record<WorkRequestFormField, string>> = {};
  for (const issue of details.data.issues) {
    const field = issue.path.split(".")[0];
    if (
      typeof field === "string" &&
      field in requestFormSchema.shape &&
      !errors[field as WorkRequestFormField]
    ) {
      errors[field as WorkRequestFormField] = "invalid";
    }
  }
  return errors;
}
