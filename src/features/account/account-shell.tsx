"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LogOut, MailCheck, MailWarning } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { AccountNav } from "@/features/account/account-nav";
import { useRouter } from "@/i18n/navigation";
import { useApiErrorToast } from "@/lib/toast/use-api-error-toast";
import { isSignedOut } from "@/lib/api/token-store";

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toLocaleUpperCase();
}

function AccountSkeleton() {
  const common = useTranslations("common");

  return (
    <div className="page-container section-y" aria-busy="true">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-10 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
      <span className="sr-only">{common("loading")}</span>
    </div>
  );
}

interface AccountShellProps {
  children: ReactNode;
}

function AccountShell({ children }: AccountShellProps) {
  const t = useTranslations("account");
  const toasts = useTranslations("toasts");
  const { user, isLoading, isLoggingOut, logout } = useAuth();
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
    return <AccountSkeleton />;
  }

  return (
    <div className="page-container section-y">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-extrabold text-brand"
              >
                {initials(user.firstName, user.lastName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-ink">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Badge
                variant={user.emailVerified ? "success" : "outline"}
                className="gap-1.5"
              >
                {user.emailVerified ? (
                  <MailCheck aria-hidden="true" />
                ) : (
                  <MailWarning aria-hidden="true" />
                )}
                {user.emailVerified
                  ? t("profile.verified")
                  : t("profile.unverified")}
              </Badge>
            </div>
          </div>

          <AccountNav />

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
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export { AccountShell };
