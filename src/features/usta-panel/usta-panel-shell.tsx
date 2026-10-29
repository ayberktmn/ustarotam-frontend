"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  BadgeCheck,
  LogOut,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { PanelAccessDenied } from "@/features/usta-panel/panel-access-denied";
import { usePanelProfile } from "@/features/usta-panel/queries";
import { WorkshopPanelNav } from "@/features/usta-panel/usta-panel-nav";
import { Link, useRouter } from "@/i18n/navigation";
import { useApiErrorToast } from "@/lib/toast/use-api-error-toast";
import { canAccessWorkshopPanel } from "@/lib/workshop-panel-access";
import { isSignedOut } from "@/lib/api/token-store";

interface WorkshopPanelShellProps {
  children: ReactNode;
}

function PanelSkeleton() {
  const common = useTranslations("common");

  return (
    <div className="page-container section-y" aria-busy="true">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <div className="h-44 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
      <span className="sr-only">{common("loading")}</span>
    </div>
  );
}

function WorkshopPanelShell({ children }: WorkshopPanelShellProps) {
  const t = useTranslations("workshopPanel");
  const toasts = useTranslations("toasts");
  const { user, isLoading, isLoggingOut, logout } = useAuth();
  const profile = usePanelProfile();
  const showApiError = useApiErrorToast();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || user || isLoggingOut) {
      return;
    }

    const returnUrl = `${window.location.pathname}${window.location.search}`;

    if (isSignedOut()) { router.replace("/"); return; }

    router.replace({
      pathname: "/giris",
      query: { returnUrl },
    });
  }, [isLoading, isLoggingOut, router, user]);

  async function handleLogout() {
    try {
      await logout();
      router.replace("/");
      toast.success(toasts("logoutSuccess"));
    } catch (error) {
      showApiError(error, { id: "logout-error" });
    }
  }

  if (isLoading || !user) {
    return <PanelSkeleton />;
  }

  if (!canAccessWorkshopPanel(user)) {
    return <PanelAccessDenied />;
  }

  const workshop = profile.data;
  const initials = workshop
    ? workshop.name
        .split(" ")
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join("")
        .toLocaleUpperCase()
    : "";

  return (
    <div className="page-container section-y">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
            {workshop ? (
              <>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-extrabold text-brand"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-ink">
                      {workshop.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {workshop.ownerName}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge
                    variant={
                      workshop.status === "PUBLISHED" ? "success" : "outline"
                    }
                  >
                    {t(`profile.status.${workshop.status}`)}
                  </Badge>
                  <Badge
                    variant={
                      workshop.verification === "VERIFIED"
                        ? "secondary"
                        : "outline"
                    }
                    className="gap-1.5"
                  >
                    {workshop.verification === "VERIFIED" ? (
                      <BadgeCheck aria-hidden="true" />
                    ) : null}
                    {t(`profile.verification.${workshop.verification}`)}
                  </Badge>
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  {workshop.city} / {workshop.district}
                </p>
              </>
            ) : (
              <div className="space-y-3" aria-busy="true">
                <div className="h-12 animate-pulse rounded-xl bg-muted" />
                <div className="h-6 w-2/3 animate-pulse rounded-lg bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded-lg bg-muted" />
              </div>
            )}
          </div>

          <WorkshopPanelNav />

          <div className="space-y-2">
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href="/hesabim">
                <ArrowLeft aria-hidden="true" />
                {t("backToAccount")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut aria-hidden="true" />
              {t("logout")}
            </Button>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export { WorkshopPanelShell };
