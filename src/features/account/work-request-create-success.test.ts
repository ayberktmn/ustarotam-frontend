import { describe, expect, it, vi } from "vitest";

import { completeWorkRequestCreate } from "@/features/account/work-request-create-success";
import type { WorkRequest } from "@/types/work-request";

const request: WorkRequest = {
  id: "10000000-0000-4000-8000-000000000001",
  vehicleType: { id: "10000000-0000-4000-8000-000000000002", name: "Car", slug: "car" },
  vehicleBrand: null,
  vehicleModel: null,
  specialty: { id: "10000000-0000-4000-8000-000000000003", name: "Engine", slug: "engine", description: null },
  province: { id: "10000000-0000-4000-8000-000000000004", name: "Ankara", slug: "ankara", code: "06" },
  district: { id: "10000000-0000-4000-8000-000000000005", name: "Cankaya", slug: "cankaya" },
  address: "123 Main Street",
  description: "Engine fault needs diagnosis",
  status: "PUBLISHED",
  assignedWorkshopId: null,
  photoCount: 0,
  createdAt: "2026-10-29T12:00:00.000Z",
  updatedAt: "2026-10-29T12:00:00.000Z",
};

describe("work request create completion", () => {
  it("shows success and opens the detail after a saved request", () => {
    const actions = {
      invalidateLists: vi.fn().mockResolvedValue(undefined),
      cacheDetail: vi.fn(),
      showSuccess: vi.fn(),
      navigateToDetail: vi.fn(),
      navigateToList: vi.fn(),
    };
    completeWorkRequestCreate(request, actions);
    expect(actions.cacheDetail).toHaveBeenCalledWith(request);
    expect(actions.showSuccess).toHaveBeenCalledOnce();
    expect(actions.navigateToDetail).toHaveBeenCalledWith(request.id);
    expect(actions.navigateToList).not.toHaveBeenCalled();
  });

  it("does not turn a redirect failure into a failed saved request", () => {
    const actions = {
      invalidateLists: vi.fn().mockResolvedValue(undefined),
      cacheDetail: vi.fn(),
      showSuccess: vi.fn(),
      navigateToDetail: vi.fn(() => { throw new Error("navigation failed"); }),
      navigateToList: vi.fn(),
    };
    expect(() => completeWorkRequestCreate(request, actions)).not.toThrow();
    expect(actions.showSuccess).toHaveBeenCalledOnce();
    expect(actions.navigateToList).toHaveBeenCalledOnce();
  });
});
