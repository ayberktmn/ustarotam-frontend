"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import {
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  setFavorites,
  subscribeToFavorites,
} from "@/lib/favorites/storage";

interface FavoritesContextValue {
  favoriteIds: readonly string[];
  isReady: boolean;
  isFavorite: (workshopId: string) => boolean;
  toggleFavorite: (workshopId: string) => boolean;
  removeFavorite: (workshopId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const t = useTranslations("account.favorites");
  const userId = user?.id ?? null;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!userId) {
        return () => {};
      }

      return subscribeToFavorites(userId, onStoreChange);
    },
    [userId],
  );

  const getSnapshot = useCallback(
    () => getFavoritesSnapshot(userId),
    [userId],
  );

  const favoriteIds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getFavoritesServerSnapshot,
  );

  const persist = useCallback(
    (nextIds: readonly string[]): boolean => {
      if (!userId) {
        return false;
      }

      if (!setFavorites(userId, nextIds)) {
        toast.error(t("storageError"));
        return false;
      }

      return true;
    },
    [t, userId],
  );

  const toggleFavorite = useCallback(
    (workshopId: string) => {
      if (!userId) {
        return false;
      }

      const currentIds = getFavoritesSnapshot(userId);
      const nextIds = currentIds.includes(workshopId)
        ? currentIds.filter((id) => id !== workshopId)
        : [workshopId, ...currentIds];

      return persist(nextIds);
    },
    [persist, userId],
  );

  const removeFavorite = useCallback(
    (workshopId: string) => {
      if (!userId) {
        return false;
      }

      return persist(
        getFavoritesSnapshot(userId).filter((id) => id !== workshopId),
      );
    },
    [persist, userId],
  );

  const isFavorite = useCallback(
    (workshopId: string) => favoriteIds.includes(workshopId),
    [favoriteIds],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      isReady: !isLoading,
      isFavorite,
      toggleFavorite,
      removeFavorite,
    }),
    [favoriteIds, isFavorite, isLoading, removeFavorite, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider.");
  }

  return context;
}

export { FavoritesProvider, useFavorites };
