import type { WorkshopReview, ReviewVerificationStatus } from "@/types/workshop";

export const REVIEW_MODERATION_STATUSES = [
  "PENDING",
  "PUBLISHED",
  "REJECTED",
  "REMOVED",
] as const;

export type ReviewModerationStatus =
  (typeof REVIEW_MODERATION_STATUSES)[number];

export type ReviewResolutionStatus = "YES" | "NO" | "PARTIAL";

export interface ReviewSpecialtyRating {
  specialtyId: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface ReviewSpecialtyRatingDetail {
  specialty: {
    id: string;
    name: string;
    slug?: string;
  };
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface CreateReviewInput {
  overallRating: 1 | 2 | 3 | 4 | 5;
  serviceDescription: string;
  serviceDate: string;
  amountPaid?: number | null;
  resolutionStatus: ReviewResolutionStatus;
  comment: string;
  specialtyRatings: ReviewSpecialtyRating[];
}

export type UpdateReviewInput = Partial<
  Omit<CreateReviewInput, "specialtyRatings">
> & {
  specialtyRatings?: ReviewSpecialtyRating[];
};

export interface OwnedReview extends WorkshopReview {
  workshopId: string;
  serviceDescription: string;
  serviceDate: string;
  resolutionStatus: ReviewResolutionStatus;
  verificationStatus: ReviewVerificationStatus;
  moderationStatus: ReviewModerationStatus;
  specialtyRatings: ReviewSpecialtyRatingDetail[];
  withdrawnAt: string | null;
}
