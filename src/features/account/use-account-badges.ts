"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/auth-provider";
import { useFavorites } from "@/features/favorites/favorites-provider";
import { browserRequest } from "@/lib/api/client";
import { createConversationService } from "@/lib/api/endpoints/conversations";
import { reviewService, workRequestService } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

const conversations = createConversationService(browserRequest);
const activeStatuses = new Set(["DRAFT", "PUBLISHED", "ASSIGNED", "IN_PROGRESS"]);

async function loadActiveRequestCount(): Promise<number> {
  const firstRequests = await workRequestService.listMine({ page: 1, limit: 100 });
  const totalPages = firstRequests.meta.totalPages ?? 1;
  const remaining = totalPages > 1
    ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => workRequestService.listMine({ page: index + 2, limit: 100 })))
    : [];
  const activeRequests = [firstRequests, ...remaining].flatMap(({ items }) => items).filter(({ status }) => activeStatuses.has(status)).length;
  return activeRequests;
}

async function loadReviewCount(): Promise<number> {
  const reviews = await reviewService.listMine(1, 1);
  return reviews.meta.total ?? reviews.items.length;
}

export function useAccountBadges() {
  const { user } = useAuth();
  const { favoriteIds, isReady } = useFavorites();
  const queryOptions = { enabled: Boolean(user), staleTime: 30_000, retry: false } as const;
  const messages = useQuery({ queryKey: [...queryKeys.accountBadges, "messages"], queryFn: conversations.unreadCount, ...queryOptions });
  const requests = useQuery({ queryKey: [...queryKeys.accountBadges, "requests"], queryFn: loadActiveRequestCount, ...queryOptions });
  const reviews = useQuery({ queryKey: [...queryKeys.accountBadges, "reviews"], queryFn: loadReviewCount, ...queryOptions });

  return {
    messages: messages.data ?? 0,
    requests: requests.data ?? 0,
    favorites: user && isReady ? favoriteIds.length : 0,
    reviews: reviews.data ?? 0,
  };
}
