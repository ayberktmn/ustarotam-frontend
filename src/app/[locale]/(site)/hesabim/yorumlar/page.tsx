import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ReviewsHistory } from "@/features/account/reviews-history";
import { createAccountMetadata } from "@/lib/account-metadata";
import type { Locale } from "@/types/locale";

interface ReviewsPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: ReviewsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return createAccountMetadata({
    locale,
    href: "/hesabim/yorumlar",
    title: t("accountReviewsTitle"),
    description: t("accountReviewsDescription"),
  });
}

export default async function ReviewsPage({ params }: ReviewsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ReviewsHistory />;
}
