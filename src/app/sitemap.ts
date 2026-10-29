import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { getSiteUrl } from "@/lib/site";
import { getWorkshopSlugs } from "@/lib/workshops";
import { locales } from "@/types/locale";

const staticRoutes = [
  { href: "/", priority: 1, changeFrequency: "weekly" },
  { href: "/usta-ara", priority: 0.9, changeFrequency: "daily" },
  { href: "/hizmetler", priority: 0.8, changeFrequency: "weekly" },
  { href: "/nasil-calisir", priority: 0.7, changeFrequency: "monthly" },
  { href: "/hakkimizda", priority: 0.6, changeFrequency: "monthly" },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const slugs = await getWorkshopSlugs();

  const pages = staticRoutes.map((route) => {
    const languages = Object.fromEntries(
      locales.map((locale) => [
        locale,
        `${siteUrl}${getPathname({ locale, href: route.href })}`,
      ]),
    );

    return locales.map((locale) => ({
      url: `${siteUrl}${getPathname({ locale, href: route.href })}`,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages },
    }));
  });

  const workshopPages = slugs.map((slug) => {
    const href = {
      pathname: "/usta/[slug]" as const,
      params: { slug },
    };
    const languages = Object.fromEntries(
      locales.map((locale) => [
        locale,
        `${siteUrl}${getPathname({ locale, href })}`,
      ]),
    );

    return locales.map((locale) => ({
      url: `${siteUrl}${getPathname({ locale, href })}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages },
    }));
  });

  return [...pages.flat(), ...workshopPages.flat()];
}
