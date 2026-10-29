import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ReviewsPanel } from "@/features/usta-panel/reviews/reviews-panel";
import { createWorkshopPanelMetadata } from "@/lib/workshop-panel-metadata";
import type { Locale } from "@/types/locale";

interface ReviewsPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: ReviewsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createWorkshopPanelMetadata({
    locale,
    href: "/usta-panel/yorumlar",
    title: t("workshopPanelReviewsTitle"),
    description: t("workshopPanelReviewsDescription"),
  });
}

export default async function ReviewsPage({ params }: ReviewsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ReviewsPanel />;
}
