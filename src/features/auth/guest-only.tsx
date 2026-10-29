"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter as useNextRouter } from "next/navigation";

import { useAuth } from "@/features/auth/auth-provider";
import { useRouter } from "@/i18n/navigation";
import { readReturnUrl } from "@/lib/return-url";
import { authPanelPath } from "./panel-path";

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const nextRouter = useNextRouter();

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    const returnUrl = readReturnUrl();

    if (returnUrl) {
      nextRouter.replace(returnUrl);
    } else {
      router.replace(authPanelPath(user));
    }
  }, [isLoading, nextRouter, router, user]);

  if (user) {
    return null;
  }

  return <>{children}</>;
}

export { GuestOnly };
