import type {
  WorkOfferStatus,
  WorkRequestStatus,
  WorkshopPanelOffer,
  WorkshopPanelRequest,
} from "@/types/usta-panel";

type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "outline"
  | "destructive"
  | "ghost"
  | "link";

export type JobFilter = "all" | "offered" | "won" | "closed";

export const REQUEST_STATUS_VARIANT: Record<
  WorkRequestStatus,
  BadgeVariant
> = {
  DRAFT: "outline",
  PUBLISHED: "success",
  CANCELLED: "destructive",
  ASSIGNED: "secondary",
  IN_PROGRESS: "secondary",
  COMPLETED: "outline",
};

export const OFFER_STATUS_VARIANT: Record<WorkOfferStatus, BadgeVariant> = {
  SUBMITTED: "secondary",
  WITHDRAWN: "outline",
  REJECTED: "destructive",
  ACCEPTED: "success",
  EXPIRED: "outline",
};

export function getEffectiveOfferStatus(
  offer: WorkshopPanelOffer,
): WorkOfferStatus {
  if (
    offer.status === "SUBMITTED" &&
    new Date(offer.expiresAt).getTime() < Date.now()
  ) {
    return "EXPIRED";
  }

  return offer.status;
}

export function matchesJobFilter(
  request: WorkshopPanelRequest,
  offer: WorkshopPanelOffer | undefined,
  filter: JobFilter,
): boolean {
  if (filter === "all") {
    return request.status === "PUBLISHED" && !offer;
  }

  if (!offer) {
    return false;
  }

  const status = getEffectiveOfferStatus(offer);

  if (filter === "offered") {
    return request.status === "PUBLISHED" && status === "SUBMITTED";
  }

  if (filter === "won") {
    return status === "ACCEPTED";
  }

  if (status === "ACCEPTED") {
    return false;
  }

  return (
    status === "REJECTED" ||
    status === "WITHDRAWN" ||
    status === "EXPIRED" ||
    request.status !== "PUBLISHED"
  );
}
