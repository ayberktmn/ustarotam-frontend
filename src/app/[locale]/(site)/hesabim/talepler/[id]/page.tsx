import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { WorkRequestDetail } from "@/features/account/work-request-detail";
import { getPathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/types/locale";

interface WorkRequestDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

export async function generateMetadata({ params }: WorkRequestDetailPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const href = (targetLocale: Locale) => getPathname({
    locale: targetLocale,
    href: { pathname: "/hesabim/talepler/[id]", params: { id } },
  });
  return {
    title: t("workRequestDetailTitle"),
    description: t("workRequestDetailDescription"),
    alternates: {
      canonical: href(locale),
      languages: Object.fromEntries(locales.map((item) => [item, href(item)])),
    },
    robots: { index: false, follow: false },
  };
}

export default async function WorkRequestDetailPage({ params }: WorkRequestDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <WorkRequestDetail id={id} />;
}
