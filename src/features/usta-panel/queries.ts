"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { workshopPanelRepository } from "@/lib/repositories/workshop-panel-repository";
import type {
  CreateWorkshopOfferInput,
  UpdateWorkshopOfferInput,
  UpdateWorkshopPanelProfileInput,
} from "@/types/usta-panel";

const PANEL_QUERY_OPTIONS = {
  staleTime: 30_000,
  retry: false,
} as const;

export function usePanelRequests() {
  return useQuery({
    queryKey: queryKeys.workshopPanel.requests,
    queryFn: () => workshopPanelRepository.listRequests(),
    ...PANEL_QUERY_OPTIONS,
  });
}

export function usePanelOffers() {
  return useQuery({
    queryKey: queryKeys.workshopPanel.offers,
    queryFn: () => workshopPanelRepository.listOffers(),
    ...PANEL_QUERY_OPTIONS,
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkshopOfferInput) =>
      workshopPanelRepository.createOffer(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.requests,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.offers,
      });
    },
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      offerId,
      input,
    }: {
      offerId: string;
      input: UpdateWorkshopOfferInput;
    }) => workshopPanelRepository.updateOffer(offerId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.offers,
      });
    },
  });
}

export function useWithdrawOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (offerId: string) =>
      workshopPanelRepository.withdrawOffer(offerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.offers,
      });
    },
  });
}

export function usePanelConversations() {
  return useQuery({
    queryKey: queryKeys.workshopPanel.conversations,
    queryFn: () => workshopPanelRepository.listConversations(),
    ...PANEL_QUERY_OPTIONS,
  });
}

export function usePanelConversation(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.workshopPanel.conversation(
      conversationId ?? "none",
    ),
    queryFn: () =>
      workshopPanelRepository.getConversation(conversationId ?? ""),
    enabled: Boolean(conversationId),
    ...PANEL_QUERY_OPTIONS,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      body,
    }: {
      conversationId: string;
      body: string;
    }) => workshopPanelRepository.sendMessage(conversationId, body),
    onSuccess: (_message, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.conversations,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.conversation(
          variables.conversationId,
        ),
      });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      workshopPanelRepository.markConversationRead(conversationId),
    onSuccess: (_result, conversationId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.conversations,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.conversation(conversationId),
      });
    },
  });
}

export function usePanelNotifications() {
  return useQuery({
    queryKey: queryKeys.workshopPanel.notifications,
    queryFn: () => workshopPanelRepository.listNotifications(),
    ...PANEL_QUERY_OPTIONS,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      workshopPanelRepository.markNotificationRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.notifications,
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => workshopPanelRepository.markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.notifications,
      });
    },
  });
}

export function usePanelReviews() {
  return useQuery({
    queryKey: queryKeys.workshopPanel.reviews,
    queryFn: () => workshopPanelRepository.listReviews(),
    ...PANEL_QUERY_OPTIONS,
  });
}

export function useReplyToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      workshopPanelRepository.replyToReview(reviewId, reply),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workshopPanel.reviews,
      });
    },
  });
}

export function usePanelProfile() {
  return useQuery({
    queryKey: queryKeys.workshopPanel.profile,
    queryFn: () => workshopPanelRepository.getProfile(),
    ...PANEL_QUERY_OPTIONS,
  });
}

export function useUpdatePanelProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkshopPanelProfileInput) =>
      workshopPanelRepository.updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.workshopPanel.profile, profile);
    },
  });
}

export function usePanelServiceAreas() {
  return useQuery({
    queryKey: queryKeys.workshopPanel.serviceAreas,
    queryFn: () => workshopPanelRepository.getServiceAreas(),
    ...PANEL_QUERY_OPTIONS,
  });
}

export function useUpdatePanelServiceAreas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workshopPanelRepository.updateServiceAreas,
    onSuccess: (areas) => {
      queryClient.setQueryData(queryKeys.workshopPanel.serviceAreas, areas);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workshopPanel.profile });
    },
  });
}

export function useUploadPanelLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => workshopPanelRepository.uploadLogo(file),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.workshopPanel.profile }),
  });
}

export function useDeletePanelLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => workshopPanelRepository.deleteLogo(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.workshopPanel.profile }),
  });
}
