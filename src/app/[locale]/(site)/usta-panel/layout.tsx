import { setRequestLocale } from "next-intl/server";

import { WorkshopPanelShell } from "@/features/usta-panel/usta-panel-shell";
import type { Locale } from "@/types/locale";

interface WorkshopPanelLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function WorkshopPanelLayout({
  children,
  params,
}: WorkshopPanelLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return <WorkshopPanelShell>{children}</WorkshopPanelShell>;
}
