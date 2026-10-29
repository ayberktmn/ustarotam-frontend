import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WorkshopApplication } from "@/features/workshop-application/workshop-application";
import { getPathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/types/locale";

interface ApplicationPageProps { params: Promise<{locale: Locale}> }

export async function generateMetadata({params}: ApplicationPageProps): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "workshopApplication"});
  return {title: t("title"), description: t("description"), robots: {index: false, follow: false}, alternates: {
    canonical: getPathname({locale, href: "/usta-ol"}),
    languages: Object.fromEntries(locales.map(locale => [locale, getPathname({locale, href: "/usta-ol"})])),
  }};
}

export default async function ApplicationPage({params}: ApplicationPageProps): Promise<React.JSX.Element> {
  const {locale} = await params;
  setRequestLocale(locale);
  return <WorkshopApplication />;
}
