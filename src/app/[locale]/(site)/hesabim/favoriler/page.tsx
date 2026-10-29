import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FavoritesList } from "@/features/account/favorites-list";
import { createAccountMetadata } from "@/lib/account-metadata";
import type { Locale } from "@/types/locale";

interface FavoritesPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: FavoritesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createAccountMetadata({
    locale,
    href: "/hesabim/favoriler",
    title: t("accountFavoritesTitle"),
    description: t("accountFavoritesDescription"),
  });
}

export default async function FavoritesPage({ params }: FavoritesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <FavoritesList />;
}
