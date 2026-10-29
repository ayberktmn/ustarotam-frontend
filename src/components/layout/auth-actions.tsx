"use client";

import { useTranslations } from "next-intl";
import { LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";

import { useApiErrorToast } from "@/lib/toast/use-api-error-toast";

import { useAuth } from "@/features/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

function AuthActions() {
  const t = useTranslations("nav");
  const auth = useTranslations("auth");
  const toasts = useTranslations("toasts");
  const { user, isLoading, isLoggingOut, logout } = useAuth();
  const showApiError = useApiErrorToast();
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
      router.replace("/");
      toast.success(toasts("logoutSuccess"));
    } catch (error) {
      showApiError(error, { id: "logout-error" });
    }
  }

  if (isLoading) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <Link
          href="/hesabim"
          aria-label={t("account")}
          title={t("account")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-brand-soft hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <UserRound aria-hidden="true" className="size-4 text-brand" />
          {user.firstName}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label={auth("logout")}
        >
          <LogOut aria-hidden="true" />
          {auth("logout")}
        </Button>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <Button asChild variant="outline" size="sm">
        <Link href="/giris">{t("login")}</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/kayit">{t("register")}</Link>
      </Button>
    </div>
  );
}

export { AuthActions };
