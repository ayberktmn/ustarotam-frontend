import type { Locale } from "@/types/locale";

function localeTag(locale: Locale): string {
  return locale === "tr" ? "tr-TR" : "en-US";
}

export function formatRating(rating: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}

export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale)).format(value);
}

export function formatDate(isoDate: string, locale: Locale): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(isoDate: string, locale: Locale): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale: Locale,
): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
