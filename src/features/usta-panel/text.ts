import type { Locale, LocalizedText } from "@/types/locale";

export function panelText(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.tr;
}
