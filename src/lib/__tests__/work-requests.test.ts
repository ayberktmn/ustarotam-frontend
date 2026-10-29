import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import {
  canCancelWorkRequest,
  getWorkRequestApiFieldErrors,
  MODEL_NOT_LISTED_VALUE,
  normalizeVehicleModelSelection,
  validateWorkRequestForm,
  type WorkRequestFormValues,
} from "@/lib/work-requests";

const validValues: WorkRequestFormValues = {
  vehicleTypeId: "10000000-0000-4000-8000-000000000001",
  vehicleBrandId: null,
  vehicleModelId: null,
  specialtyId: "10000000-0000-4000-8000-000000000002",
  provinceId: "10000000-0000-4000-8000-000000000003",
  districtId: "10000000-0000-4000-8000-000000000004",
  address: "123 Main Street",
  description: "Fault",
};

describe("work request form rules", () => {
  it("matches backend UUID and text boundaries", () => {
    expect(validateWorkRequestForm(validValues).data).toEqual(validValues);
    expect(validateWorkRequestForm({ ...validValues, address: "1234", description: "four" }).errors)
      .toMatchObject({ address: "invalid", description: "invalid" });
  });

  it("maps backend string issue paths and ignores unknown fields", () => {
    const error = new ApiError({
      kind: "validation", code: "VALIDATION_ERROR", status: 400, message: "Invalid",
      details: { issues: [{ path: "address", message: "Too short" }, { path: "customerId", message: "Unknown" }] },
    });
    expect(getWorkRequestApiFieldErrors(error)).toEqual({ address: "invalid" });
  });

  it("allows cancellation only in repository-supported states", () => {
    expect(canCancelWorkRequest("DRAFT")).toBe(true);
    expect(canCancelWorkRequest("PUBLISHED")).toBe(true);
    expect(canCancelWorkRequest("ASSIGNED")).toBe(true);
    expect(canCancelWorkRequest("CANCELLED")).toBe(false);
    expect(canCancelWorkRequest("COMPLETED")).toBe(false);
  });

  it("turns the not-listed model selection into the nullable backend value", () => {
    expect(normalizeVehicleModelSelection(MODEL_NOT_LISTED_VALUE)).toBeNull();
    expect(normalizeVehicleModelSelection("")).toBeNull();
    expect(normalizeVehicleModelSelection("10000000-0000-4000-8000-000000000009"))
      .toBe("10000000-0000-4000-8000-000000000009");
  });
});
