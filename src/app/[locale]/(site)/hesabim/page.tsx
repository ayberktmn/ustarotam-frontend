import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountOverview } from "@/features/account/account-overview";
import { createAccountMetadata } from "@/lib/account-metadata";
import { searchWorkshops } from "@/lib/workshops";
import { DEFAULT_WORKSHOP_FILTERS } from "@/types/search";
import type { Locale } from "@/types/locale";

interface AccountPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: AccountPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createAccountMetadata({
    locale,
    href: "/hesabim",
    title: t("accountTitle"),
    description: t("accountDescription"),
  });
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { workshops } = await searchWorkshops(
    DEFAULT_WORKSHOP_FILTERS,
    locale,
  );

  return <AccountOverview workshops={workshops} />;
}
