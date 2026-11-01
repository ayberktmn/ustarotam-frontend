import { z } from "zod";

import { browserRequest } from "@/lib/api/client";
import { createReviewService } from "@/lib/api/endpoints/reviews";
import { createWorkRequestService } from "@/lib/api/endpoints/work-requests";
import { createWorkshopService } from "@/lib/api/endpoints/workshops";
import { apiWorkshopLogoSchema } from "@/lib/api/schemas";
import type { WorkshopPanelRepository } from "@/lib/repositories/workshop-panel-repository";
import type {
  PanelNotificationType,
  PanelRoute,
  PanelVerificationStatus,
  WorkshopPanelConversation,
  WorkshopPanelMessage,
  WorkshopPanelNotification,
  WorkshopPanelOffer,
  WorkshopPanelRequest,
  WorkshopPanelReview,
} from "@/types/usta-panel";

const localized = (value: string) => ({ tr: value, en: value });
const panelReviewService = createReviewService(browserRequest);
const panelWorkRequestService = createWorkRequestService(browserRequest);
const panelWorkshopService = createWorkshopService(browserRequest);
const paginationSchema = z.object({ page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative() });
const paged = <T extends z.ZodTypeAny>(item: T) => z.object({ success: z.literal(true), data: z.array(item), meta: z.record(z.string(), z.unknown()).optional() });
const entity = <T extends z.ZodTypeAny>(item: T) => z.object({ success: z.literal(true), data: item });

const requestSchema = z.object({
  id: z.string(), description: z.string().nullable().optional(), status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"]), createdAt: z.coerce.string().nullable().optional(),
  vehicleType: z.object({ name: z.string() }), vehicleBrand: z.object({ name: z.string() }).nullable().optional(),
  vehicleModel: z.object({ name: z.string() }).nullable().optional(), specialty: z.object({ name: z.string() }),
  province: z.object({ name: z.string() }), district: z.object({ name: z.string() }),
  address: z.string().optional(), photoCount: z.number().int().nonnegative().optional(),
  _count: z.object({ photos: z.number() }).nullable().optional(),
});
const matchingPaged = z.object({ success: z.literal(true), data: z.array(requestSchema), meta: paginationSchema });
const offerRequestSchema = z.object({
  id: z.string(),
  status: requestSchema.shape.status,
  vehicleType: z.object({ name: z.string() }),
  vehicleBrand: z.object({ name: z.string() }).nullable(),
  vehicleModel: z.object({ name: z.string() }).nullable(),
  specialty: z.object({ name: z.string() }),
  province: z.object({ name: z.string() }),
  district: z.object({ name: z.string() }),
  address: z.string(),
});

const offerSchema = z.object({
  id: z.string(), requestId: z.string(), amount: z.coerce.number(), currency: z.enum(["TRY", "EUR", "USD"]), description: z.string(),
  expiresAt: z.coerce.string(), status: z.enum(["SUBMITTED", "WITHDRAWN", "REJECTED", "ACCEPTED", "EXPIRED"]), createdAt: z.coerce.string(), updatedAt: z.coerce.string(), request: offerRequestSchema,
});

const conversationSchema = z.object({
  id: z.string(), requestId: z.string(), customerName: z.string(), requestTitle: z.string(), lastMessage: z.string(),
  lastMessageAt: z.coerce.string().nullable(), unreadCount: z.number(),
});
const messageSchema = z.object({ id: z.string(), body: z.string(), createdAt: z.coerce.string(), readAt: z.coerce.string().nullable(), sender: z.enum(["WORKSHOP", "CUSTOMER"]) });
const conversationDetailSchema = z.object({ id: z.string(), requestId: z.string(), messages: z.array(messageSchema) });

const notificationSchema = z.object({ id: z.string(), type: z.string(), title: z.string(), body: z.string(), requestId: z.string().nullable().optional(), readAt: z.coerce.string().nullable(), createdAt: z.coerce.string() });
const namedProfileRelationSchema = z.object({ id: z.string(), name: z.string() });
const serviceAreaSchema = z.object({ province: namedProfileRelationSchema, district: namedProfileRelationSchema.nullable() });
const profileSchema = z.object({
  id: z.string(), name: z.string(), ownerName: z.string(), email: z.string(), phone: z.string(), description: z.string().nullable(), logoUrl: apiWorkshopLogoSchema.nullable().optional(),
  province: z.object({ id: z.string(), name: z.string() }), district: z.object({ id: z.string(), name: z.string() }), address: z.string(),
  status: z.enum(["PUBLISHED", "PENDING", "SUSPENDED"]), verificationStatus: z.string(),
  specialties: z.array(z.object({ id: z.string(), name: z.string() })),
  vehicleTypes: z.array(namedProfileRelationSchema).optional().default([]), brands: z.array(namedProfileRelationSchema).optional().default([]),
  serviceAreas: z.array(serviceAreaSchema),
  averageRating: z.number().nullable(), reviewCount: z.number(),
});

function mapRequest(row: z.infer<typeof requestSchema>): WorkshopPanelRequest {
  return { id: row.id, vehicle: { type: localized(row.vehicleType.name), brand: row.vehicleBrand?.name ?? "", model: row.vehicleModel?.name ?? "", year: 0, fuel: localized("") }, specialty: localized(row.specialty.name), city: row.province.name, district: row.district.name, address: row.address, distanceKm: null, description: localized(row.description ?? ""), photoCount: row.photoCount ?? row._count?.photos ?? 0, budget: null, status: row.status, createdAt: row.createdAt ?? "" };
}

function mapOffer(row: z.infer<typeof offerSchema>): WorkshopPanelOffer {
  return { id: row.id, requestId: row.requestId, request: { status: row.request.status, vehicleLabel: [row.request.vehicleBrand?.name, row.request.vehicleModel?.name].filter(Boolean).join(" ") || row.request.vehicleType.name, specialty: localized(row.request.specialty.name), city: row.request.province.name, district: row.request.district.name, address: row.request.address }, amount: row.amount, currency: row.currency, description: row.description, expiresAt: row.expiresAt, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function mapConversation(row: z.infer<typeof conversationSchema>): WorkshopPanelConversation {
  return { id: row.id, customerName: row.customerName, requestId: row.requestId, requestTitle: localized(row.requestTitle), lastMessage: localized(row.lastMessage), lastMessageAt: row.lastMessageAt ?? new Date(0).toISOString(), unreadCount: row.unreadCount };
}

function mapMessage(row: z.infer<typeof messageSchema>, conversationId: string): WorkshopPanelMessage {
  return { id: row.id, conversationId, sender: row.sender, body: localized(row.body), sentAt: row.createdAt, read: row.readAt !== null };
}

const notificationTypeMap: Record<string, PanelNotificationType> = { MATCHED_WORK: "NEW_MATCH", NEW_OFFER: "NEW_MATCH", OFFER_ACCEPTED: "OFFER_ACCEPTED", OFFER_REJECTED: "OFFER_REJECTED", NEW_MESSAGE: "NEW_MESSAGE", REQUEST_STATUS: "REQUEST_COMPLETED" };
const notificationRoutes: Partial<Record<PanelNotificationType, PanelRoute>> = { NEW_MATCH: "/usta-panel/isler", OFFER_ACCEPTED: "/usta-panel/teklifler", OFFER_REJECTED: "/usta-panel/teklifler", NEW_MESSAGE: "/usta-panel/mesajlar", REQUEST_COMPLETED: "/usta-panel/isler", REVIEW_RECEIVED: "/usta-panel/yorumlar" };
function mapNotification(row: z.infer<typeof notificationSchema>): WorkshopPanelNotification {
  const type = notificationTypeMap[row.type] ?? "REQUEST_COMPLETED";
  return { id: row.id, type, title: localized(row.title), body: localized(row.body), createdAt: row.createdAt, read: row.readAt !== null, href: notificationRoutes[type] ?? null };
}

export function createApiWorkshopPanelRepository(): WorkshopPanelRepository {
  return {
    async listRequests() {
      const getPage = (page: number) => browserRequest({ path: "/work-requests", query: { page, limit: 20 }, schema: matchingPaged, responseMode: "raw", auth: "required" });
      const first = await getPage(1);
      const remaining = await Promise.all(Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) => getPage(index + 2)));
      return [first, ...remaining].flatMap((response) => response.data).map(mapRequest);
    },
    async listOffers() { const response = await browserRequest({ path: "/work-offers/mine", schema: paged(offerSchema), responseMode: "raw", auth: "required" }); return response.data.map(mapOffer); },
    async createOffer(input) { const { requestId, ...body } = input; const row = await browserRequest({ path: `/work-requests/${encodeURIComponent(requestId)}/offers`, method: "POST", body, schema: offerSchema, auth: "required", retries: 0 }); return mapOffer(row); },
    async startRequest(requestId) { await panelWorkRequestService.start(requestId); },
    async updateOffer(offerId, input) { await browserRequest({ path: `/work-offers/${encodeURIComponent(offerId)}`, method: "PATCH", body: input, schema: z.void(), auth: "required", retries: 0 }); const offers = await this.listOffers(); const updated = offers.find(({ id }) => id === offerId); if (!updated) throw new Error("Updated offer was not returned by the API."); return updated; },
    async withdrawOffer(offerId) { await browserRequest({ path: `/work-offers/${encodeURIComponent(offerId)}/withdraw`, method: "POST", schema: z.void(), auth: "required", retries: 0 }); },
    async listConversations() { const response = await browserRequest({ path: "/conversations", schema: paged(conversationSchema), responseMode: "raw", auth: "required" }); return response.data.map(mapConversation); },
    async getConversation(conversationId) { const [list, detail] = await Promise.all([this.listConversations(), browserRequest({ path: `/conversations/${encodeURIComponent(conversationId)}`, schema: entity(conversationDetailSchema), responseMode: "raw", auth: "required" })]); const summary = list.find(({ id }) => id === conversationId); if (!summary) throw new Error("Conversation was not returned by the API."); return { ...summary, messages: detail.data.messages.map((message) => mapMessage(message, conversationId)) }; },
    async sendMessage(conversationId, body) { const row = await browserRequest({ path: `/requests/${encodeURIComponent(conversationId)}/messages`, method: "POST", body: { body }, schema: z.object({ id: z.string(), body: z.string(), createdAt: z.coerce.string(), readAt: z.coerce.string().nullable() }), auth: "required", retries: 0 }); return { id: row.id, conversationId, sender: "WORKSHOP", body: localized(row.body), sentAt: row.createdAt, read: row.readAt !== null }; },
    async markConversationRead(conversationId) { await browserRequest({ path: `/conversations/${encodeURIComponent(conversationId)}/read`, method: "POST", schema: z.void(), auth: "required", retries: 0 }); },
    async listNotifications() { const response = await browserRequest({ path: "/notifications", schema: paged(notificationSchema), responseMode: "raw", auth: "required" }); return response.data.map(mapNotification); },
    async markNotificationRead(notificationId) { await browserRequest({ path: `/notifications/${encodeURIComponent(notificationId)}/read`, method: "POST", schema: z.void(), auth: "required", retries: 0 }); },
    async markAllNotificationsRead() { await browserRequest({ path: "/notifications/read-all", method: "POST", schema: z.void(), auth: "required", retries: 0 }); },
    async listReviews() {
      const profile = await this.getProfile();
      const response = await panelWorkshopService.getReviews(profile.id, 1, 100);
      const reviews = response.items.map((row): WorkshopPanelReview => ({
        id: row.id,
        authorName: row.authorName,
        rating: row.rating,
        comment: row.comment,
        serviceDate: row.createdAt,
        vehicleLabel: "",
        verified: row.verificationStatus === "VERIFIED",
        ownerReply: row.ownerReply?.reply ?? null,
      }));
      const total = Number(response.meta.total ?? reviews.length);
      const average = reviews.length === 0
        ? 0
        : reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      const distribution = [5, 4, 3, 2, 1].map((stars) => ({
        stars: stars as 1 | 2 | 3 | 4 | 5,
        count: reviews.filter((review) => review.rating === stars).length,
      }));
      return { reviews, summary: { average, total, distribution } };
    },
    async replyToReview(reviewId, reply) {
      await panelReviewService.reply(reviewId, reply);
    },
    async getProfile() { const row = await browserRequest({ path: "/workshops/mine/profile", schema: profileSchema, auth: "required" }); return { id: row.id, name: row.name, ownerName: row.ownerName, email: row.email, phone: row.phone, logoUrl: row.logoUrl ?? null, about: localized(row.description ?? ""), provinceId: row.province.id, districtId: row.district.id, city: row.province.name, district: row.district.name, address: localized(row.address), status: row.status, verification: row.verificationStatus as PanelVerificationStatus, specialties: row.specialties.map(({ name }) => localized(name)), specialtyIds: row.specialties.map(({ id }) => id), vehicleTypeIds: row.vehicleTypes.map(({ id }) => id), brandIds: row.brands.map(({ id }) => id), serviceAreas: row.serviceAreas.map(({ province, district }) => ({ provinceId: province.id, districtId: district?.id ?? null, city: province.name, district: district?.name ?? "" })), rating: row.averageRating ?? 0, reviewCount: row.reviewCount }; },
    async updateProfile(input) { const profile = await this.getProfile(); await panelWorkshopService.update(profile.id, { name: input.name, email: input.email, phone: input.phone, provinceId: input.provinceId, districtId: input.districtId, address: input.address, description: input.about.tr, specialtyIds: input.specialtyIds, vehicleTypeIds: input.vehicleTypeIds, brandIds: input.brandIds }); return this.getProfile(); },
    async getServiceAreas() { const rows = await browserRequest({ path: "/workshops/mine/service-areas", schema: z.array(serviceAreaSchema), auth: "required" }); return rows.map(({ province, district }) => ({ provinceId: province.id, districtId: district?.id ?? null, city: province.name, district: district?.name ?? "" })); },
    async updateServiceAreas(areas) { const rows = await browserRequest({ path: "/workshops/mine/service-areas", method: "PUT", body: { areas }, schema: z.array(serviceAreaSchema), auth: "required", retries: 0 }); return rows.map(({ province, district }) => ({ provinceId: province.id, districtId: district?.id ?? null, city: province.name, district: district?.name ?? "" })); },
    async uploadLogo(file) { const result = await browserRequest({ path: "/workshops/mine/logo", method: "PUT", binaryBody: file, schema: z.object({ logoUrl: z.string().url() }), auth: "required", retries: 0 }); return result.logoUrl; },
    async deleteLogo() { await browserRequest({ path: "/workshops/mine/logo", method: "DELETE", schema: z.void(), auth: "required", retries: 0 }); },
  };
}
