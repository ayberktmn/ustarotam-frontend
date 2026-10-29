import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NotificationsView } from "@/features/usta-panel/notifications/notifications-view";
import { createWorkshopPanelMetadata } from "@/lib/workshop-panel-metadata";
import type { Locale } from "@/types/locale";

interface NotificationsPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: NotificationsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createWorkshopPanelMetadata({
    locale,
    href: "/usta-panel/bildirimler",
    title: t("workshopPanelNotificationsTitle"),
    description: t("workshopPanelNotificationsDescription"),
  });
}

export default async function NotificationsPage({
  params,
}: NotificationsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <NotificationsView />;
}
