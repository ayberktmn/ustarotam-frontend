import type { Metadata } from "next";

import { getPathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/types/locale";

type WorkshopPanelHref =
  | "/usta-panel"
  | "/usta-panel/isler"
  | "/usta-panel/teklifler"
  | "/usta-panel/mesajlar"
  | "/usta-panel/bildirimler"
  | "/usta-panel/yorumlar"
  | "/usta-panel/profil";

interface WorkshopPanelMetadataInput {
  locale: Locale;
  href: WorkshopPanelHref;
  title: string;
  description: string;
}

export function createWorkshopPanelMetadata({
  locale,
  href,
  title,
  description,
}: WorkshopPanelMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: getPathname({ locale, href }),
      languages: Object.fromEntries(
        locales.map((item) => [
          item,
          getPathname({ locale: item, href }),
        ]),
      ),
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}
