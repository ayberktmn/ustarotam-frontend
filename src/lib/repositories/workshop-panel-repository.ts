import {
  panelConversationsSeed,
  panelMessagesSeed,
  panelNotificationsSeed,
  panelOffersSeed,
  panelProfileSeed,
  panelRequestsSeed,
  panelReviewsSeed,
} from "@/lib/repositories/workshop-panel-mock-data";
import type {
  CreateWorkshopOfferInput,
  UpdateWorkshopOfferInput,
  UpdateWorkshopPanelProfileInput,
  WorkshopPanelConversation,
  WorkshopPanelConversationDetail,
  WorkshopPanelMessage,
  WorkshopPanelNotification,
  WorkshopPanelOffer,
  WorkshopPanelProfile,
  WorkshopPanelRequest,
  WorkshopPanelReviews,
  WorkshopPanelServiceArea,
  UpdateWorkshopServiceAreasInput,
} from "@/types/usta-panel";
import { createApiWorkshopPanelRepository } from "@/lib/repositories/workshop-panel-api-repository";

export type WorkshopPanelErrorCode =
  | "REQUEST_NOT_FOUND"
  | "REQUEST_NOT_AVAILABLE"
  | "OFFER_ALREADY_EXISTS"
  | "OFFER_NOT_FOUND"
  | "OFFER_NOT_EDITABLE";

export class WorkshopPanelError extends Error {
  readonly code: WorkshopPanelErrorCode;

  constructor(code: WorkshopPanelErrorCode, message: string) {
    super(message);
    this.name = "WorkshopPanelError";
    this.code = code;
  }
}

export interface WorkshopPanelRepository {
  listRequests(): Promise<WorkshopPanelRequest[]>;
  listOffers(): Promise<WorkshopPanelOffer[]>;
  createOffer(input: CreateWorkshopOfferInput): Promise<WorkshopPanelOffer>;
  updateOffer(
    offerId: string,
    input: UpdateWorkshopOfferInput,
  ): Promise<WorkshopPanelOffer>;
  withdrawOffer(offerId: string): Promise<void>;
  listConversations(): Promise<WorkshopPanelConversation[]>;
  getConversation(
    conversationId: string,
  ): Promise<WorkshopPanelConversationDetail>;
  sendMessage(
    conversationId: string,
    body: string,
  ): Promise<WorkshopPanelMessage>;
  markConversationRead(conversationId: string): Promise<void>;
  listNotifications(): Promise<WorkshopPanelNotification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  listReviews(): Promise<WorkshopPanelReviews>;
  replyToReview(reviewId: string, reply: string): Promise<void>;
  getProfile(): Promise<WorkshopPanelProfile>;
  updateProfile(
    input: UpdateWorkshopPanelProfileInput,
  ): Promise<WorkshopPanelProfile>;
  getServiceAreas(): Promise<WorkshopPanelServiceArea[]>;
  updateServiceAreas(areas: UpdateWorkshopServiceAreasInput[]): Promise<WorkshopPanelServiceArea[]>;
  uploadLogo(file: File): Promise<string>;
  deleteLogo(): Promise<void>;
}

const MOCK_LATENCY_MS = 180;

function respond<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(value)), MOCK_LATENCY_MS);
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildOffer(
  input: CreateWorkshopOfferInput,
  request: WorkshopPanelRequest,
): WorkshopPanelOffer {
  const timestamp = nowIso();

  return {
    id: `off-${Date.now()}`,
    requestId: input.requestId,
    request: {
      vehicleLabel: `${request.vehicle.year} ${request.vehicle.brand} ${request.vehicle.model}`,
      specialty: request.specialty,
      city: request.city,
      district: request.district,
    },
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    expiresAt: input.expiresAt,
    status: "SUBMITTED",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function summarizeReviews(
  reviews: WorkshopPanelReviews["reviews"],
): WorkshopPanelReviews {
  const total = reviews.length;
  const average =
    total === 0
      ? 0
      : Math.round(
          (reviews.reduce((sum, review) => sum + review.rating, 0) / total) *
            10,
        ) / 10;

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars: stars as 1 | 2 | 3 | 4 | 5,
    count: reviews.filter((review) => review.rating === stars).length,
  }));

  return {
    reviews: [...reviews].sort((a, b) =>
      a.serviceDate < b.serviceDate ? 1 : -1,
    ),
    summary: { average, total, distribution },
  };
}

export function createMockWorkshopPanelRepository(): WorkshopPanelRepository {
  const requests = structuredClone(panelRequestsSeed);
  let offers = structuredClone(panelOffersSeed);
  let conversations = structuredClone(panelConversationsSeed);
  let messages = structuredClone(panelMessagesSeed);
  let notifications = structuredClone(panelNotificationsSeed);
  let reviews = structuredClone(panelReviewsSeed);
  let profile = structuredClone(panelProfileSeed);

  return {
    async listRequests() {
      return respond(
        [...requests].sort((a, b) =>
          a.createdAt < b.createdAt ? 1 : -1,
        ),
      );
    },

    async listOffers() {
      return respond(
        [...offers].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      );
    },

    async createOffer(input) {
      const request = requests.find((item) => item.id === input.requestId);

      if (!request) {
        throw new WorkshopPanelError(
          "REQUEST_NOT_FOUND",
          "Work request was not found.",
        );
      }

      if (request.status !== "PUBLISHED") {
        throw new WorkshopPanelError(
          "REQUEST_NOT_AVAILABLE",
          "Work request is not open for offers.",
        );
      }

      if (offers.some((offer) => offer.requestId === input.requestId)) {
        throw new WorkshopPanelError(
          "OFFER_ALREADY_EXISTS",
          "An offer already exists for this request.",
        );
      }

      const offer = buildOffer(input, request);
      offers = [offer, ...offers];

      return respond(offer);
    },

    async updateOffer(offerId, input) {
      const offer = offers.find((item) => item.id === offerId);

      if (!offer) {
        throw new WorkshopPanelError(
          "OFFER_NOT_FOUND",
          "Offer was not found.",
        );
      }

      if (offer.status !== "SUBMITTED") {
        throw new WorkshopPanelError(
          "OFFER_NOT_EDITABLE",
          "Offer is no longer editable.",
        );
      }

      const updated: WorkshopPanelOffer = {
        ...offer,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        expiresAt: input.expiresAt,
        updatedAt: nowIso(),
      };
      offers = offers.map((item) => (item.id === offerId ? updated : item));

      return respond(updated);
    },

    async withdrawOffer(offerId) {
      const offer = offers.find((item) => item.id === offerId);

      if (!offer) {
        throw new WorkshopPanelError(
          "OFFER_NOT_FOUND",
          "Offer was not found.",
        );
      }

      if (offer.status !== "SUBMITTED") {
        throw new WorkshopPanelError(
          "OFFER_NOT_EDITABLE",
          "Offer is no longer withdrawable.",
        );
      }

      offers = offers.map((item) =>
        item.id === offerId
          ? { ...item, status: "WITHDRAWN", updatedAt: nowIso() }
          : item,
      );
    },

    async listConversations() {
      return respond(
        [...conversations].sort((a, b) =>
          a.lastMessageAt < b.lastMessageAt ? 1 : -1,
        ),
      );
    },

    async getConversation(conversationId) {
      const conversation = conversations.find(
        (item) => item.id === conversationId,
      );

      if (!conversation) {
        throw new WorkshopPanelError(
          "REQUEST_NOT_FOUND",
          "Conversation was not found.",
        );
      }

      return respond({
        ...conversation,
        messages: messages[conversationId] ?? [],
      });
    },

    async sendMessage(conversationId, body) {
      const conversation = conversations.find(
        (item) => item.id === conversationId,
      );

      if (!conversation) {
        throw new WorkshopPanelError(
          "REQUEST_NOT_FOUND",
          "Conversation was not found.",
        );
      }

      const message: WorkshopPanelMessage = {
        id: `msg-${Date.now()}`,
        conversationId,
        sender: "WORKSHOP",
        body: { tr: body, en: body },
        sentAt: nowIso(),
        read: true,
      };

      messages = {
        ...messages,
        [conversationId]: [...(messages[conversationId] ?? []), message],
      };
      conversations = conversations.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              lastMessage: message.body,
              lastMessageAt: message.sentAt,
            }
          : item,
      );

      return respond(message);
    },

    async markConversationRead(conversationId) {
      messages = {
        ...messages,
        [conversationId]: (messages[conversationId] ?? []).map((message) => ({
          ...message,
          read: true,
        })),
      };
      conversations = conversations.map((item) =>
        item.id === conversationId ? { ...item, unreadCount: 0 } : item,
      );
    },

    async listNotifications() {
      return respond(
        [...notifications].sort((a, b) =>
          a.createdAt < b.createdAt ? 1 : -1,
        ),
      );
    },

    async markNotificationRead(notificationId) {
      notifications = notifications.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      );
    },

    async markAllNotificationsRead() {
      notifications = notifications.map((item) => ({
        ...item,
        read: true,
      }));
    },

    async listReviews() {
      return respond(summarizeReviews(reviews));
    },

    async replyToReview(reviewId, reply) {
      reviews = reviews.map((review) =>
        review.id === reviewId ? { ...review, ownerReply: reply } : review,
      );
      return respond(undefined);
    },

    async getProfile() {
      return respond(profile);
    },

    async updateProfile(input) {
      profile = {
        ...profile,
        name: input.name,
        email: input.email,
        phone: input.phone,
        provinceId: input.provinceId,
        districtId: input.districtId,
        address: { tr: input.address, en: input.address },
        about: input.about,
        ...(input.specialtyIds && { specialtyIds: input.specialtyIds }),
        ...(input.vehicleTypeIds && { vehicleTypeIds: input.vehicleTypeIds }),
        ...(input.brandIds && { brandIds: input.brandIds }),
      };

      return respond(profile);
    },
    async getServiceAreas() { return respond(profile.serviceAreas); },
    async updateServiceAreas(areas) {
      profile = { ...profile, serviceAreas: areas.map((area) => ({ ...area, city: area.provinceId, district: area.districtId ?? "" })) };
      return respond(profile.serviceAreas);
    },
    async uploadLogo() { const logoUrl = "https://example.test/logo.webp"; profile = { ...profile, logoUrl }; return logoUrl; },
    async deleteLogo() { profile = { ...profile, logoUrl: null }; },
  };
}

export const workshopPanelRepository: WorkshopPanelRepository =
  createApiWorkshopPanelRepository();
