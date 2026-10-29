"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { workshopService } from "@/lib/api";
import type { WorkshopListQuery } from "@/lib/api/endpoints/workshops";
import { queryKeys } from "@/lib/query/keys";

export function useWorkshops(query: WorkshopListQuery = {}) {
  return useQuery({
    queryKey: queryKeys.workshops.list(query as Record<string, unknown>),
    queryFn: () => workshopService.list(query),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useWorkshop(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workshops.detail(id ?? "none"),
    queryFn: () => workshopService.getById(id ?? ""),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}

export function useWorkshopReviews(id: string) {
  return useQuery({
    queryKey: queryKeys.workshops.reviews(id),
    queryFn: () => workshopService.getReviews(id, 1, 100),
    staleTime: 60_000,
  });
}
