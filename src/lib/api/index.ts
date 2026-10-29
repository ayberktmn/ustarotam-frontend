import { browserRequest } from "@/lib/api/client";
import { createCatalogService } from "@/lib/api/endpoints/catalog";
import { createWorkshopService } from "@/lib/api/endpoints/workshops";
import { createReviewService } from "@/lib/api/endpoints/reviews";

export { authService, bootstrapSession } from "@/lib/api/endpoints/auth";
export { workshopApplicationService } from "@/lib/api/endpoints/workshop-applications";
export { ApiError, isApiError } from "@/lib/api/errors";
export type { CatalogItem } from "@/lib/api/endpoints/catalog";
export type {
  CreateWorkshopInput,
  UpdateWorkshopInput,
  WorkshopListQuery,
} from "@/lib/api/endpoints/workshops";

export const catalogService = createCatalogService(browserRequest);
export const workshopService = createWorkshopService(browserRequest);
export const reviewService = createReviewService(browserRequest);
export { getApiHealth } from "@/lib/api/endpoints/health";
