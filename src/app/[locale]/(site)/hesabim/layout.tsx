import { setRequestLocale } from "next-intl/server";

import { AccountShell } from "@/features/account/account-shell";
import type { Locale } from "@/types/locale";

interface AccountLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <AccountShell>{children}</AccountShell>;
}
