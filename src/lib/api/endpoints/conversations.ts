import { z } from "zod";

import type { ApiRequestFn } from "@/lib/api/client";
import type {
  WorkshopPanelConversation,
  WorkshopPanelConversationDetail,
  WorkshopPanelMessage,
} from "@/types/usta-panel";

const localized = (value: string) => ({ tr: value, en: value });
const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
const summarySchema = z.object({
  id: z.string(),
  requestId: z.string(),
  customerName: z.string(),
  requestTitle: z.string(),
  lastMessage: z.string(),
  lastMessageAt: z.coerce.string().nullable(),
  unreadCount: z.number().int().nonnegative(),
});
const messageSchema = z.object({
  id: z.string(),
  body: z.string(),
  sender: z.enum(["CUSTOMER", "WORKSHOP"]),
  createdAt: z.coerce.string(),
  readAt: z.coerce.string().nullable(),
});
const listSchema = z.object({
  success: z.literal(true),
  data: z.array(summarySchema),
  meta: paginationSchema,
});
const messagesSchema = z.object({
  success: z.literal(true),
  data: z.array(messageSchema),
  meta: paginationSchema,
});
const entity = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema });
const unreadCountSchema = entity(z.object({ count: z.number().int().nonnegative() }));

function mapSummary(row: z.infer<typeof summarySchema>): WorkshopPanelConversation {
  return {
    id: row.id,
    requestId: row.requestId,
    customerName: row.customerName,
    requestTitle: localized(row.requestTitle),
    lastMessage: localized(row.lastMessage),
    lastMessageAt: row.lastMessageAt ?? new Date(0).toISOString(),
    unreadCount: row.unreadCount,
  };
}

function mapMessage(row: z.infer<typeof messageSchema>, conversationId: string): WorkshopPanelMessage {
  return {
    id: row.id,
    conversationId,
    sender: row.sender,
    body: localized(row.body),
    sentAt: row.createdAt,
    read: row.readAt !== null,
  };
}

export function createConversationService(request: ApiRequestFn) {
  return {
    async list(): Promise<WorkshopPanelConversation[]> {
      const response = await request({ path: "/conversations", query: { page: 1, limit: 100 }, schema: listSchema, responseMode: "raw", auth: "required" });
      return response.data.map(mapSummary);
    },
    async get(conversationId: string): Promise<WorkshopPanelConversationDetail> {
      const encoded = encodeURIComponent(conversationId);
      const [detail, messages] = await Promise.all([
        request({ path: `/conversations/${encoded}`, schema: entity(summarySchema), responseMode: "raw", auth: "required" }),
        request({ path: `/conversations/${encoded}/messages`, query: { page: 1, limit: 100 }, schema: messagesSchema, responseMode: "raw", auth: "required" }),
      ]);
      return { ...mapSummary(detail.data), messages: messages.data.map((message) => mapMessage(message, conversationId)) };
    },
    async create(offerId: string): Promise<string> {
      const response = await request({ path: "/conversations", method: "POST", body: { offerId }, schema: entity(z.object({ id: z.string(), requestId: z.string(), offerId: z.string() })), responseMode: "raw", auth: "required", retries: 0 });
      return response.data.id;
    },
    async send(conversationId: string, body: string): Promise<WorkshopPanelMessage> {
      const row = await request({ path: `/conversations/${encodeURIComponent(conversationId)}/messages`, method: "POST", body: { body }, schema: messageSchema, auth: "required", retries: 0 });
      return mapMessage(row, conversationId);
    },
    markRead(conversationId: string): Promise<void> {
      return request({ path: `/conversations/${encodeURIComponent(conversationId)}/read`, method: "POST", schema: z.void(), auth: "required", retries: 0 });
    },
    async unreadCount(): Promise<number> {
      const response = await request({ path: "/messages/unread-count", schema: unreadCountSchema, responseMode: "raw", auth: "required" });
      return response.data.count;
    },
  };
}
