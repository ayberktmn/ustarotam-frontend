import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { JobsView } from "@/features/usta-panel/jobs/jobs-view";
import { createWorkshopPanelMetadata } from "@/lib/workshop-panel-metadata";
import type { Locale } from "@/types/locale";

interface JobsPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: JobsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createWorkshopPanelMetadata({
    locale,
    href: "/usta-panel/isler",
    title: t("workshopPanelJobsTitle"),
    description: t("workshopPanelJobsDescription"),
  });
}

export default async function JobsPage({ params }: JobsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <JobsView />;
}
