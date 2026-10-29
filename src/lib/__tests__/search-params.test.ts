import { describe, expect, it } from "vitest";

import {
  getActiveFilterCount,
  getWorkshopSearchQuery,
  parseWorkshopSearchParams,
} from "@/lib/search-params";

describe("workshop search URL parameters", () => {
  it("preserves supported filters and drops unsupported rating filters", () => {
    const filters = parseWorkshopSearchParams({
      q: "  Ankara  ",
      sehir: "Ankara",
      ilce: "Çankaya",
      marka: "10000000-0000-4000-8000-000000000001",
      uzmanlik: "fren-yuruyen",
      aracTuru: "otomobil",
      minPuan: "4.5",
      minYorum: "10",
      sirala: "yeni",
      sayfa: "3",
    });

    expect(getWorkshopSearchQuery(filters)).toEqual({
      q: "Ankara",
      sehir: "Ankara",
      ilce: "Çankaya",
      marka: "10000000-0000-4000-8000-000000000001",
      uzmanlik: "fren-yuruyen",
      aracTuru: "otomobil",
      sirala: "yeni",
      sayfa: "3",
    });
    expect(filters.minRating).toBe(0);
    expect(filters.minReviewCount).toBe(0);
    expect(getActiveFilterCount(filters)).toBe(6);
  });

  it("resets pagination when a supported filter changes", () => {
    const filters = parseWorkshopSearchParams({
      marka: "10000000-0000-4000-8000-000000000001",
      sayfa: "4",
    });

    expect(getWorkshopSearchQuery(filters, { brand: "" })).toEqual({});
  });

  it("uses only the supported sort choices", () => {
    expect(parseWorkshopSearchParams({ sirala: "yorum" }).sort).toBe("puan");
    expect(parseWorkshopSearchParams({ sirala: "yeni" }).sort).toBe("yeni");
  });
});
