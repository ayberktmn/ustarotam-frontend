import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { WorkRequestCreate } from "@/features/account/work-request-create";
import { createAccountMetadata } from "@/lib/account-metadata";
import type { Locale } from "@/types/locale";

interface NewWorkRequestPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: NewWorkRequestPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return createAccountMetadata({
    locale,
    href: "/hesabim/talepler/yeni",
    title: t("newWorkRequestTitle"),
    description: t("newWorkRequestDescription"),
  });
}

export default async function NewWorkRequestPage({ params }: NewWorkRequestPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WorkRequestCreate />;
}
