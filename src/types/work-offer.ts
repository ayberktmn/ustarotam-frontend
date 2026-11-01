import type {
  WorkRequestCatalogItem,
  WorkRequestSpecialty,
  WorkRequestStatus,
} from "@/types/work-request";

export const workOfferStatuses = [
  "SUBMITTED",
  "WITHDRAWN",
  "REJECTED",
  "ACCEPTED",
  "EXPIRED",
] as const;

export type WorkOfferStatus = (typeof workOfferStatuses)[number];
export type WorkOfferCurrency = "TRY" | "EUR" | "USD";

export interface WorkOfferRequest {
  id: string;
  status: WorkRequestStatus;
  vehicleType: WorkRequestCatalogItem;
  vehicleBrand: WorkRequestCatalogItem | null;
  vehicleModel: WorkRequestCatalogItem | null;
  specialty: WorkRequestSpecialty;
  province: WorkRequestCatalogItem;
  district: WorkRequestCatalogItem;
  address: string;
}

export interface WorkOffer {
  id: string;
  requestId: string;
  amount: number;
  currency: WorkOfferCurrency;
  description: string;
  expiresAt: string;
  status: WorkOfferStatus;
  createdAt: string;
  updatedAt: string;
  request: WorkOfferRequest;
}

export interface CreateWorkOfferInput {
  amount: number;
  currency: WorkOfferCurrency;
  description: string;
  expiresAt: string;
}
