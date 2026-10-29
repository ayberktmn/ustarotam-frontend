import type { LocalizedText } from "@/types/locale";

export const SPECIALTY_SLUGS = [
  "motor-mekanigi",
  "oto-elektrik",
  "radyator-sogutma",
  "sanziman",
  "klima",
  "fren-yuruyen",
  "kaporta-boya",
  "periyodik-bakim",
  "lastik",
  "suspansiyon",
] as const;

export type SpecialtySlug = (typeof SPECIALTY_SLUGS)[number];

export const VEHICLE_TYPE_SLUGS = ["otomobil", "suv", "ticari"] as const;

export type VehicleTypeSlug = (typeof VEHICLE_TYPE_SLUGS)[number];

export type VerificationStatus = "verified" | "pending";

export interface Specialty {
  slug: SpecialtySlug;
  name: LocalizedText;
  shortName: LocalizedText;
  description: LocalizedText;
}

export interface VehicleType {
  slug: VehicleTypeSlug;
  name: LocalizedText;
}

export interface SpecialtySummary extends Specialty {
  workshopCount: number;
}

export interface WorkshopReview {
  id: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: LocalizedText;
  createdAt: string;
  moderationStatus?: "PENDING" | "PUBLISHED" | "REJECTED" | "REMOVED";
  vehicle?: LocalizedText;
  verificationStatus?: ReviewVerificationStatus;
  ownerReply?: ReviewOwnerReply | null;
}

export type ReviewVerificationStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

export interface ReviewOwnerReply {
  reply: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopReviewSpecialty {
  id: string;
  name: LocalizedText;
}

export interface WorkshopRatingBreakdown {
  serviceQuality: number;
  priceTransparency: number;
  communication: number;
  punctuality: number;
}

export interface Workshop {
  id: string;
  slug: string;
  name: string;
  city: string;
  district: string;
  specialties: SpecialtySlug[];
  /** API kimlikleri, yorum formundaki specialtyRatings alanı için kullanılır. */
  reviewSpecialties?: WorkshopReviewSpecialty[];
  vehicleTypes: VehicleTypeSlug[];
  /** Henüz değerlendirmesi olmayan işletmeler için null. */
  rating: number | null;
  reviewCount: number;
  address: string;
  phone: string;
  description: LocalizedText;
  verificationStatus: VerificationStatus;
  ratingBreakdown: WorkshopRatingBreakdown | null;
  reviews: WorkshopReview[];
  coverImage: string;
  /** Ana sayfada öne çıkanları sıralamak için kullanılır. */
  featuredRank?: number;
}
