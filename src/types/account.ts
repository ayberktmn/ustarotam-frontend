import type { OwnedReview } from "@/types/review";

export interface AccountReviewPreview {
  review: OwnedReview;
  workshop: {
    slug: string;
    name: string;
  };
}
