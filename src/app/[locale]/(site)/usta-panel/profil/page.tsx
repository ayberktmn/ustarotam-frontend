import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProfilePanel } from "@/features/usta-panel/profile/profile-panel";
import { createWorkshopPanelMetadata } from "@/lib/workshop-panel-metadata";
import type { Locale } from "@/types/locale";

interface ProfilePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createWorkshopPanelMetadata({
    locale,
    href: "/usta-panel/profil",
    title: t("workshopPanelProfileTitle"),
    description: t("workshopPanelProfileDescription"),
  });
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProfilePanel />;
}
