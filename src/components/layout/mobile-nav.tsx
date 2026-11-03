"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, BriefcaseBusiness, Heart, LogOut, Menu, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import { useAccountBadges } from "@/features/account/use-account-badges";
import { useApiErrorToast } from "@/lib/toast/use-api-error-toast";
import { canAccessWorkshopPanel } from "@/lib/workshop-panel-access";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

const items = [
  { href: "/", key: "home" },
  { href: "/usta-ara", key: "workshops" },
  { href: "/hizmetler", key: "services" },
] as const;

function MobileNav() {
  const t = useTranslations("nav");
  const auth = useTranslations("auth");
  const account = useTranslations("account");
  const toasts = useTranslations("toasts");
  const { user, isLoading, isLoggingOut, logout } = useAuth();
  const counts = useAccountBadges();
  const showApiError = useApiErrorToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);

    try {
      await logout();
      router.replace("/");
      toast.success(toasts("logoutSuccess"));
    } catch (error) {
      showApiError(error, { id: "logout-error" });
    }
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 items-center justify-center rounded-lg border border-line bg-card text-ink transition-colors hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {open ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[4.5rem] z-40 cursor-default bg-ink/35 backdrop-blur-[2px]"
          />
          <div
            id="mobile-menu"
            className="fixed inset-x-0 top-[4.5rem] z-50 max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-line bg-card p-4 shadow-xl"
          >
            <nav aria-label={t("menu")} className="space-y-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-brand-soft hover:text-brand"
                >
                  {t(item.key)}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                </Link>
              ))}
            </nav>

            <div className="my-4 h-px bg-line" />

            <div className="flex items-center justify-between gap-3">
              <Link
                href="/hesabim/favoriler"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-ink transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Heart aria-hidden="true" className="size-4" />
                {t("favorites")}
              </Link>
              <LanguageSwitcher />
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="grid gap-2">
                  <div className="h-10 animate-pulse rounded-lg bg-muted" />
                  <div className="h-10 animate-pulse rounded-lg bg-muted" />
                </div>
              ) : user ? (
                <div className="rounded-xl border border-line bg-muted p-4">
                  <Link
                    href="/hesabim"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <UserRound aria-hidden="true" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                  </Link>

                  {canAccessWorkshopPanel(user) ? (
                    <Link
                      href="/usta-panel"
                      onClick={() => setOpen(false)}
                      className="mt-3 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-brand-soft hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="inline-flex items-center gap-2">
                        <BriefcaseBusiness
                          aria-hidden="true"
                          className="size-4 text-brand"
                        />
                        {account("nav.workshopPanel")}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 text-muted-foreground"
                      />
                    </Link>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {([
                      ["/hesabim/mesajlar", "messages"],
                      ["/hesabim/talepler", "requests"],
                      ["/hesabim/favoriler", "favorites"],
                      ["/hesabim/yorumlar", "reviews"],
                    ] as const).map(([href, key]) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-brand-soft hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {account(`nav.${key}`)}
                        {counts[key] > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white" aria-label={account("nav.count", { count: counts[key] })}>
                            {counts[key]}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <LogOut aria-hidden="true" />
                    {auth("logout")}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Button asChild variant="outline">
                    <Link href="/giris" onClick={() => setOpen(false)}>
                      <UserRound aria-hidden="true" />
                      {t("login")}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/kayit" onClick={() => setOpen(false)}>
                      {t("register")}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export { MobileNav };
