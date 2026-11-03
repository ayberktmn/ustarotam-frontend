"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { browserRequest } from "@/lib/api/client";
import { createConversationService } from "@/lib/api/endpoints/conversations";
import { queryKeys } from "@/lib/query/keys";

const service = createConversationService(browserRequest);
const options = { staleTime: 30_000, retry: false } as const;

export function useCustomerConversations() {
  return useQuery({ queryKey: queryKeys.accountMessages.conversations, queryFn: service.list, ...options });
}

export function useCustomerConversation(id: string | null) {
  return useQuery({ queryKey: queryKeys.accountMessages.conversation(id ?? "none"), queryFn: () => service.get(id ?? ""), enabled: Boolean(id), ...options });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: service.create, onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.accountMessages.conversations }) });
}

export function useSendCustomerMessage() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) => service.send(conversationId, body), onSuccess: (_message, input) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.accountMessages.conversations });
    void queryClient.invalidateQueries({ queryKey: queryKeys.accountMessages.conversation(input.conversationId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.accountBadges });
  } });
}

export function useMarkCustomerConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: service.markRead, onSuccess: (_result, id) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.accountMessages.conversations });
    void queryClient.invalidateQueries({ queryKey: queryKeys.accountMessages.conversation(id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.accountBadges });
  } });
}
