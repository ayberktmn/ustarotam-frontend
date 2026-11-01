export const workRequestStatuses = [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export type WorkRequestStatus = (typeof workRequestStatuses)[number];

export interface WorkRequestCatalogItem {
  id: string;
  name: string;
  slug: string;
}

export interface WorkRequestProvince extends WorkRequestCatalogItem {
  code: string;
}

export interface WorkRequestSpecialty extends WorkRequestCatalogItem {
  description: string | null;
}

export interface WorkRequest {
  id: string;
  vehicleType: WorkRequestCatalogItem;
  vehicleBrand: WorkRequestCatalogItem | null;
  vehicleModel: WorkRequestCatalogItem | null;
  specialty: WorkRequestSpecialty;
  province: WorkRequestProvince;
  district: WorkRequestCatalogItem;
  address: string;
  description: string;
  status: WorkRequestStatus;
  assignedWorkshopId: string | null;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkRequestInput {
  vehicleTypeId: string;
  vehicleBrandId?: string | null;
  vehicleModelId?: string | null;
  specialtyId: string;
  provinceId: string;
  districtId: string;
  address: string;
  description: string;
}

export type UpdateWorkRequestInput = Partial<CreateWorkRequestInput>;
