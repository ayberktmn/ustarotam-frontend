import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MessagesView } from "@/features/usta-panel/messages/messages-view";
import { createWorkshopPanelMetadata } from "@/lib/workshop-panel-metadata";
import type { Locale } from "@/types/locale";

interface MessagesPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: MessagesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createWorkshopPanelMetadata({
    locale,
    href: "/usta-panel/mesajlar",
    title: t("workshopPanelMessagesTitle"),
    description: t("workshopPanelMessagesDescription"),
  });
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MessagesView />;
}
