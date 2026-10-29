import type { VehicleTypeSlug } from "@/types/workshop";

export const WORKSHOP_SORTS = ["puan", "yeni"] as const;

export type WorkshopSort = (typeof WORKSHOP_SORTS)[number] | "yorum";

export interface WorkshopFilters {
  query: string;
  city: string;
  district: string;
  brand: string;
  specialty: string;
  vehicleType: VehicleTypeSlug | "";
  /** Kept for the local demo repository; these are not public API filters. */
  minRating: number;
  minReviewCount: number;
  sort: WorkshopSort;
  page: number;
}

export const DEFAULT_WORKSHOP_FILTERS: WorkshopFilters = {
  query: "",
  city: "",
  district: "",
  brand: "",
  specialty: "",
  vehicleType: "",
  minRating: 0,
  minReviewCount: 0,
  sort: "puan",
  page: 1,
};

export interface WorkshopSearchResult {
  workshops: import("@/types/workshop").Workshop[];
  total: number;
  page: number;
  totalPages: number;
  filters: WorkshopFilters;
}
