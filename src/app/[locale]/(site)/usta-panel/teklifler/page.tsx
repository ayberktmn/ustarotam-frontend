import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { OffersView } from "@/features/usta-panel/offers/offers-view";
import { createWorkshopPanelMetadata } from "@/lib/workshop-panel-metadata";
import type { Locale } from "@/types/locale";

interface OffersPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: OffersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createWorkshopPanelMetadata({
    locale,
    href: "/usta-panel/teklifler",
    title: t("workshopPanelOffersTitle"),
    description: t("workshopPanelOffersDescription"),
  });
}

export default async function OffersPage({ params }: OffersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OffersView />;
}
