"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useFavorites } from "@/features/favorites/favorites-provider";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  workshopId: string;
  workshopName: string;
  variant?: "overlay" | "outline";
  className?: string;
}

function FavoriteButton({
  workshopId,
  workshopName,
  variant = "outline",
  className,
}: FavoriteButtonProps) {
  const t = useTranslations("account.favorites");
  const { user } = useAuth();
  const { isFavorite, isReady, toggleFavorite } = useFavorites();
  const router = useRouter();

  const active = isFavorite(workshopId);
  const disabled = !isReady;
  const label = active
    ? t("removeFor", { name: workshopName })
    : t("addFor", { name: workshopName });

  function handleClick() {
    if (disabled) {
      return;
    }

    if (!user) {
      const returnUrl =
        typeof window === "undefined"
          ? "/hesabim/favoriler"
          : `${window.location.pathname}${window.location.search}`;

      toast.info(t("loginRequired"));
      router.push({
        pathname: "/giris",
        query: { returnUrl },
      });
      return;
    }

    const wasFavorite = active;

    if (toggleFavorite(workshopId)) {
      toast.success(wasFavorite ? t("removedToast") : t("addedToast"));
    }
  }

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        className={cn(
          "absolute flex items-center justify-center rounded-full bg-card/95 text-ink shadow-sm backdrop-blur transition-colors hover:bg-card hover:text-brand focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none disabled:opacity-60",
          className,
        )}
      >
        <Heart
          aria-hidden="true"
          className={cn("size-4", active && "fill-brand text-brand")}
        />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={active ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={className}
    >
      <Heart aria-hidden="true" className={cn(active && "fill-brand")} />
      {active ? t("remove") : t("add")}
    </Button>
  );
}

export { FavoriteButton };
