import type { WorkRequest } from "@/types/work-request";

export interface WorkRequestCreateSuccessActions {
  invalidateLists: () => Promise<unknown>;
  cacheDetail: (request: WorkRequest) => void;
  showSuccess: () => void;
  navigateToDetail: (id: string) => void;
  navigateToList: () => void;
}

export function completeWorkRequestCreate(
  request: WorkRequest,
  actions: WorkRequestCreateSuccessActions,
): void {
  void actions.invalidateLists().catch(() => undefined);

  try {
    actions.cacheDetail(request);
  } catch {
    // Cache failures must not turn an already-created request into an error.
  }

  try {
    actions.showSuccess();
  } catch {
    // A notification failure must not change the create result.
  }

  try {
    actions.navigateToDetail(request.id);
  } catch {
    try {
      actions.navigateToList();
    } catch {
      // Navigation is progressive enhancement after a successful mutation.
    }
  }
}
