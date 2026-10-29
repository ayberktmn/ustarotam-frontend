"use client";

import { Heart, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { AccountEmptyState } from "@/features/account/account-empty-state";
import { FavoriteCard } from "@/features/account/favorite-card";
import { useFavorites } from "@/features/favorites/favorites-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/features/auth/auth-provider";
import { Link } from "@/i18n/navigation";
import { ApiError, workshopService } from "@/lib/api";
import type { Workshop } from "@/types/workshop";

interface FavoritesData {
  workshops: Workshop[];
  unavailableIds: string[];
}

async function loadFavoriteWorkshops(
  ids: readonly string[],
  signal: AbortSignal,
): Promise<FavoritesData> {
  const workshops: Workshop[] = [];
  const unavailableIds: string[] = [];

  for (let index = 0; index < ids.length; index += 10) {
    const batch = ids.slice(index, index + 10);
    const results = await Promise.all(batch.map(async (id) => {
      try {
        return { id, workshop: await workshopService.getById(id, { signal }) };
      } catch (error) {
        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
          return { id, workshop: null };
        }

        throw error;
      }
    }));

    for (const result of results) {
      if (result.workshop) {
        workshops.push(result.workshop);
      } else {
        unavailableIds.push(result.id);
      }
    }
  }

  return { workshops, unavailableIds };
}

function UnavailableFavorite({ id }: { id: string }) {
  const t = useTranslations("account.favorites");
  const { removeFavorite } = useFavorites();

  function handleRemove() {
    if (removeFavorite(id)) {
      toast.success(t("removedToast"));
    }
  }

  return (
    <article className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card p-4 shadow-card">
      <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
      <Button type="button" variant="outline" size="sm" onClick={handleRemove}>
        <Heart aria-hidden="true" />
        {t("remove")}
      </Button>
    </article>
  );
}

function FavoritesList() {
  const t = useTranslations("account");
  const common = useTranslations("common");
  const { user } = useAuth();
  const { favoriteIds, isReady } = useFavorites();
  const favorites = useQuery({
    queryKey: ["favorites", "workshops", user?.id ?? null, favoriteIds],
    queryFn: ({ signal }) => loadFavoriteWorkshops(favoriteIds, signal),
    enabled: isReady && favoriteIds.length > 0,
    staleTime: 60_000,
  });

  const favoriteWorkshops = favorites.data?.workshops ?? [];
  const unavailableIds = favorites.data?.unavailableIds ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">{t("favorites.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("favorites.description")}
          </p>
        </div>
        {isReady ? (
          <Badge variant="secondary">
            {t("favorites.count", { count: favoriteIds.length })}
          </Badge>
        ) : null}
      </header>

      {!isReady || favorites.isPending && favoriteIds.length > 0 ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : favorites.isError ? (
        <ErrorState
          title={t("favorites.errorTitle")}
          description={t("favorites.errorDescription")}
          retryLabel={common("retry")}
          onRetry={() => void favorites.refetch()}
        />
      ) : favoriteWorkshops.length > 0 || unavailableIds.length > 0 ? (
        <div className="space-y-3">
          {favoriteWorkshops.map((workshop) => (
            <FavoriteCard key={workshop.id} workshop={workshop} />
          ))}
          {unavailableIds.map((id) => (
            <UnavailableFavorite key={id} id={id} />
          ))}
        </div>
      ) : (
        <AccountEmptyState
          icon={Heart}
          title={t("favorites.emptyTitle")}
          description={t("favorites.emptyDescription")}
          action={
            <Button asChild>
              <Link href="/usta-ara">{t("favorites.searchCta")}</Link>
            </Button>
          }
        />
      )}

      <p className="flex items-start gap-2 rounded-xl border border-line bg-muted px-4 py-3 text-xs text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {t("favorites.storageNote")}
      </p>
    </div>
  );
}

export { FavoritesList };
