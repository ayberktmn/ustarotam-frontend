import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PanelOverview } from "@/features/usta-panel/panel-overview";
import { createWorkshopPanelMetadata } from "@/lib/workshop-panel-metadata";
import type { Locale } from "@/types/locale";

interface WorkshopPanelPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: WorkshopPanelPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createWorkshopPanelMetadata({
    locale,
    href: "/usta-panel",
    title: t("workshopPanelTitle"),
    description: t("workshopPanelDescription"),
  });
}

export default async function WorkshopPanelPage({
  params,
}: WorkshopPanelPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PanelOverview />;
}
