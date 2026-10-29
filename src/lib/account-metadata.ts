import type { Metadata } from "next";

import { getPathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/types/locale";

type AccountHref =
  | "/hesabim"
  | "/hesabim/profil"
  | "/hesabim/favoriler"
  | "/hesabim/yorumlar"
  | "/hesabim/talepler"
  | "/hesabim/talepler/yeni";

interface AccountMetadataInput {
  locale: Locale;
  href: AccountHref;
  title: string;
  description: string;
}

export function createAccountMetadata({
  locale,
  href,
  title,
  description,
}: AccountMetadataInput): Metadata {
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
