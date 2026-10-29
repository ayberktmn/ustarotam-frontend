import type { Locale } from "@/types/locale";
import type {
  WorkshopFilters,
  WorkshopSearchResult,
} from "@/types/search";
import type {
  Specialty,
  SpecialtySummary,
  VehicleType,
  Workshop,
} from "@/types/workshop";

/**
 * Veri erişim sınırı. Bugün yerel veriyle çalışan uygulama, backend hazır
 * olduğunda bu arayüzü uygulayan bir HTTP repository ile değiştirilebilir.
 * UI ve sayfaların bu arayüzden haberi olmaz.
 */
export interface WorkshopRepository {
  search(filters: WorkshopFilters, locale: Locale): Promise<WorkshopSearchResult>;
  getBySlug(slug: string): Promise<Workshop | null>;
  getFeatured(limit: number): Promise<readonly Workshop[]>;
  getSpecialties(): Promise<readonly Specialty[]>;
  getSpecialtyCards(): Promise<readonly SpecialtySummary[]>;
  getVehicleTypes(): Promise<readonly VehicleType[]>;
  getCities(): Promise<readonly string[]>;
  getDistricts(city?: string): Promise<readonly string[]>;
  getSlugs(): Promise<readonly string[]>;
}
