import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { WorkRequestsList } from "@/features/account/work-requests-list";
import { createAccountMetadata } from "@/lib/account-metadata";
import type { Locale } from "@/types/locale";

interface WorkRequestsPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: WorkRequestsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return createAccountMetadata({
    locale,
    href: "/hesabim/talepler",
    title: t("accountRequestsTitle"),
    description: t("accountRequestsDescription"),
  });
}

export default async function WorkRequestsPage({ params }: WorkRequestsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WorkRequestsList />;
}
