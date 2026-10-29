import "server-only";

import { specialties } from "@/data/specialties";
import { vehicleTypes } from "@/data/vehicle-types";
import { workshops } from "@/data/workshops";
import type { Locale } from "@/types/locale";
import type { WorkshopRepository } from "@/types/repository";
import type { WorkshopFilters } from "@/types/search";
import type {
  Specialty,
  SpecialtySummary,
  Workshop,
} from "@/types/workshop";

const specialtyBySlug = new Map<string, Specialty>(
  specialties.map((specialty) => [specialty.slug, specialty]),
);

/**
 * Türkçe karakterleri sadeleştirerek arama eşleşmesini daha toleranslı
 * yapar. "Şanzıman" araması "sanziman" ile de eşleşir.
 */
function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ç", "c")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("â", "a")
    .replaceAll("î", "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "tr-TR");
}

function compareRating(a: Workshop, b: Workshop): number {
  return (b.rating ?? -1) - (a.rating ?? -1);
}

function matchesQuery(
  workshop: Workshop,
  query: string,
  locale: Locale,
): boolean {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) {
    return true;
  }

  const specialtyNames = workshop.specialties
    .map((slug) => specialtyBySlug.get(slug)?.name[locale] ?? slug)
    .join(" ");

  const searchableText = normalizeForSearch(
    [
      workshop.name,
      workshop.city,
      workshop.district,
      workshop.address,
      workshop.description[locale],
      specialtyNames,
    ].join(" "),
  );

  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchableText.includes(term));
}

function sortWorkshops(
  items: Workshop[],
  sort: WorkshopFilters["sort"],
): Workshop[] {
  return [...items].sort((a, b) => {
    if (sort === "puan") {
      return (
        compareRating(a, b) ||
        b.reviewCount - a.reviewCount ||
        compareText(a.name, b.name)
      );
    }

    if (sort === "yorum") {
      return (
        b.reviewCount - a.reviewCount ||
        compareRating(a, b) ||
        compareText(a.name, b.name)
      );
    }

    const aRank = a.featuredRank ?? Number.MAX_SAFE_INTEGER;
    const bRank = b.featuredRank ?? Number.MAX_SAFE_INTEGER;

    return (
      aRank - bRank ||
      compareRating(a, b) ||
      b.reviewCount - a.reviewCount ||
      compareText(a.name, b.name)
    );
  });
}

export const localWorkshopRepository: WorkshopRepository = {
  async search(filters, locale) {
    const city = filters.city ? normalizeForSearch(filters.city) : "";
    const district = filters.district
      ? normalizeForSearch(filters.district)
      : "";
    const specialty = filters.specialty;

    const filtered = workshops.filter((workshop) => {
      if (city && normalizeForSearch(workshop.city) !== city) {
        return false;
      }

      if (district && normalizeForSearch(workshop.district) !== district) {
        return false;
      }

      if (specialty && !workshop.specialties.some((slug) => slug === specialty)) {
        return false;
      }

      if (
        filters.vehicleType &&
        !workshop.vehicleTypes.includes(filters.vehicleType)
      ) {
        return false;
      }

      if (
        filters.minRating > 0 &&
        (workshop.rating === null || workshop.rating < filters.minRating)
      ) {
        return false;
      }

      if (workshop.reviewCount < filters.minReviewCount) {
        return false;
      }

      return matchesQuery(workshop, filters.query, locale);
    });

    const sorted = sortWorkshops(filtered, filters.sort);

    return {
      workshops: sorted.slice((filters.page - 1) * 12, filters.page * 12),
      total: sorted.length,
      page: filters.page,
      totalPages: Math.max(1, Math.ceil(sorted.length / 12)),
      filters,
    };
  },

  async getBySlug(slug) {
    return workshops.find((workshop) => workshop.slug === slug) ?? null;
  },

  async getFeatured(limit) {
    return [...workshops]
      .filter((workshop) => workshop.featuredRank !== undefined)
      .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0))
      .slice(0, limit);
  },

  async getSpecialties() {
    return specialties;
  },

  async getSpecialtyCards(): Promise<readonly SpecialtySummary[]> {
    return specialties.map((specialty) => ({
      ...specialty,
      workshopCount: workshops.filter((workshop) =>
        workshop.specialties.includes(specialty.slug),
      ).length,
    }));
  },

  async getVehicleTypes() {
    return vehicleTypes;
  },

  async getCities() {
    return [...new Set(workshops.map((workshop) => workshop.city))].sort(
      compareText,
    );
  },

  async getDistricts(city) {
    const relevantWorkshops = city
      ? workshops.filter(
          (workshop) =>
            normalizeForSearch(workshop.city) === normalizeForSearch(city),
        )
      : workshops;

    return [
      ...new Set(relevantWorkshops.map((workshop) => workshop.district)),
    ].sort(compareText);
  },

  async getSlugs() {
    return workshops.map((workshop) => workshop.slug);
  },
};
