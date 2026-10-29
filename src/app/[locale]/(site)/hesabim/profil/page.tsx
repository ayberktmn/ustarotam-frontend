import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProfileDetails } from "@/features/account/profile-details";
import { createAccountMetadata } from "@/lib/account-metadata";
import type { Locale } from "@/types/locale";

interface ProfilePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createAccountMetadata({
    locale,
    href: "/hesabim/profil",
    title: t("accountProfileTitle"),
    description: t("accountProfileDescription"),
  });
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProfileDetails />;
}
