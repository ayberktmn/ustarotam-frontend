import type { LocalizedText } from "@/types/locale";

export const WORK_REQUEST_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "ASSIGNED",
  "COMPLETED",
] as const;

export type WorkRequestStatus = (typeof WORK_REQUEST_STATUSES)[number];

export const WORK_OFFER_STATUSES = [
  "SUBMITTED",
  "WITHDRAWN",
  "REJECTED",
  "ACCEPTED",
  "EXPIRED",
] as const;

export type WorkOfferStatus = (typeof WORK_OFFER_STATUSES)[number];

export type OfferCurrency = "TRY" | "EUR" | "USD";

export interface PanelVehicle {
  type: LocalizedText;
  brand: string;
  model: string;
  year: number;
  fuel: LocalizedText;
}

export interface PanelBudget {
  min: number;
  max: number;
}

export interface WorkshopPanelRequest {
  id: string;
  vehicle: PanelVehicle;
  specialty: LocalizedText;
  city: string;
  district: string;
  distanceKm: number | null;
  description: LocalizedText;
  photoCount: number;
  budget: PanelBudget | null;
  status: WorkRequestStatus;
  createdAt: string;
}

export interface WorkshopPanelOfferRequest {
  vehicleLabel: string;
  specialty: LocalizedText;
  city: string;
  district: string;
}

export interface WorkshopPanelOffer {
  id: string;
  requestId: string;
  request: WorkshopPanelOfferRequest;
  amount: number;
  currency: OfferCurrency;
  description: string;
  expiresAt: string;
  status: WorkOfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkshopOfferInput {
  requestId: string;
  amount: number;
  currency: OfferCurrency;
  description: string;
  expiresAt: string;
}

export interface UpdateWorkshopOfferInput {
  amount: number;
  currency: OfferCurrency;
  description: string;
  expiresAt: string;
}

export type PanelMessageSender = "WORKSHOP" | "CUSTOMER";

export interface WorkshopPanelConversation {
  id: string;
  customerName: string;
  requestId: string;
  requestTitle: LocalizedText;
  lastMessage: LocalizedText;
  lastMessageAt: string;
  unreadCount: number;
}

export interface WorkshopPanelMessage {
  id: string;
  conversationId: string;
  sender: PanelMessageSender;
  body: LocalizedText;
  sentAt: string;
  read: boolean;
}

export interface WorkshopPanelConversationDetail
  extends WorkshopPanelConversation {
  messages: WorkshopPanelMessage[];
}

export const PANEL_NOTIFICATION_TYPES = [
  "NEW_MATCH",
  "OFFER_ACCEPTED",
  "OFFER_REJECTED",
  "NEW_MESSAGE",
  "REQUEST_COMPLETED",
  "REVIEW_RECEIVED",
] as const;

export type PanelNotificationType =
  (typeof PANEL_NOTIFICATION_TYPES)[number];

export type PanelRoute =
  | "/usta-panel"
  | "/usta-panel/isler"
  | "/usta-panel/teklifler"
  | "/usta-panel/mesajlar"
  | "/usta-panel/bildirimler"
  | "/usta-panel/yorumlar"
  | "/usta-panel/profil";

export interface WorkshopPanelNotification {
  id: string;
  type: PanelNotificationType;
  title: LocalizedText;
  body: LocalizedText;
  createdAt: string;
  read: boolean;
  href: PanelRoute | null;
}

export interface WorkshopPanelReview {
  id: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: LocalizedText;
  serviceDate: string;
  vehicleLabel: string;
  verified: boolean;
  ownerReply?: string | null;
}

export interface WorkshopPanelRatingDistribution {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
}

export interface WorkshopPanelRatingSummary {
  average: number;
  total: number;
  distribution: WorkshopPanelRatingDistribution[];
}

export interface WorkshopPanelReviews {
  reviews: WorkshopPanelReview[];
  summary: WorkshopPanelRatingSummary;
}

export type PanelProfileStatus = "PUBLISHED" | "PENDING" | "SUSPENDED";

export type PanelVerificationStatus =
  | "VERIFIED"
  | "PENDING"
  | "REJECTED"
  | "SUSPENDED";

export interface WorkshopPanelServiceArea {
  city: string;
  district: string;
}

export interface WorkshopPanelProfile {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  about: LocalizedText;
  city: string;
  district: string;
  address: LocalizedText;
  status: PanelProfileStatus;
  verification: PanelVerificationStatus;
  specialties: LocalizedText[];
  specialtyIds: string[];
  serviceAreas: WorkshopPanelServiceArea[];
  rating: number;
  reviewCount: number;
}

export interface UpdateWorkshopPanelProfileInput {
  name: string;
  phone: string;
  about: LocalizedText;
  specialtyIds?: string[];
}
