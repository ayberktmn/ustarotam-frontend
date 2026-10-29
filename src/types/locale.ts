export const locales = ["tr", "en"] as const;

export type Locale = (typeof locales)[number];

export type LocalizedText = Record<Locale, string>;

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
