import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronDown, ChevronRight, SearchX, SlidersHorizontal } from "lucide-react";

import { ActiveFilters } from "@/features/search/active-filters";
import { SearchResultsSkeleton } from "@/features/search/search-results-skeleton";
import { SearchSort } from "@/features/search/search-sort";
import { WorkshopFiltersForm } from "@/features/search/workshop-filters-form";
import { WorkshopCard } from "@/features/workshops/workshop-card";
import { Button } from "@/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import {
  getActiveFilterCount,
  getWorkshopSearchQuery,
  parseWorkshopSearchParams,
  type RawSearchParams,
} from "@/lib/search-params";
import {
  getCities,
  getDistricts,
  getSpecialties,
  getVehicleBrands,
  getVehicleTypes,
  searchWorkshops,
} from "@/lib/workshops";
import type { Locale } from "@/types/locale";

interface SearchPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({
  params,
}: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const canonical = getPathname({ locale, href: "/usta-ara" });

  return {
    title: t("searchTitle"),
    description: t("searchDescription"),
    alternates: {
      canonical,
      languages: {
        tr: getPathname({ locale: "tr", href: "/usta-ara" }),
        en: getPathname({ locale: "en", href: "/usta-ara" }),
      },
    },
    openGraph: {
      title: t("searchTitle"),
      description: t("searchDescription"),
      url: canonical,
    },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, meta, nav] = await Promise.all([
    getTranslations("filters"),
    getTranslations("metadata"),
    getTranslations("nav"),
  ]);

  return (
    <>
      <section className="border-b border-line bg-secondary/60">
        <div className="page-container py-8 lg:py-10">
          <nav aria-label={nav("menu")}>
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {nav("home")}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3" />
              </li>
              <li>
                <span aria-current="page" className="font-semibold text-ink">
                  {nav("workshops")}
                </span>
              </li>
            </ol>
          </nav>

          <h1 className="mt-4 text-h1 text-ink">{meta("searchTitle")}</h1>
          <p className="mt-2 max-w-2xl text-body text-muted-foreground">
            {meta("searchDescription")}
          </p>
        </div>
      </section>

      <div className="page-container py-8 lg:py-10">
        <Suspense
          fallback={<SearchResultsSkeleton label={t("resultsLoading")} />}
        >
          <SearchContent locale={locale} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function SearchContent({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<RawSearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const filters = parseWorkshopSearchParams(rawSearchParams);
  const activeFilterCount = getActiveFilterCount(filters);

  const [result, cities, districts, specialties, vehicleTypes, vehicleBrands, t] =
    await Promise.all([
      searchWorkshops(filters, locale),
      getCities(),
      getDistricts(filters.city),
      getSpecialties(),
      getVehicleTypes(),
      getVehicleBrands(),
      getTranslations("filters"),
    ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside aria-label={t("title")} className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-line bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-ink">
              <SlidersHorizontal
                aria-hidden="true"
                className="size-4 text-brand"
              />
              {t("title")}
            </h2>
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-deep">
                {activeFilterCount}
              </span>
            ) : null}
          </div>

          <div className="mt-5">
            <WorkshopFiltersForm
              filters={filters}
              cities={cities}
              districts={districts}
              specialties={specialties}
              vehicleTypes={vehicleTypes}
              vehicleBrands={vehicleBrands}
              idPrefix="masaustu"
            />
          </div>
        </div>
      </aside>

      <div>
        <div className="lg:hidden">
          <details
            open={activeFilterCount > 0}
            className="group rounded-2xl border border-line bg-card shadow-card"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-bold text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="size-4 text-brand"
                />
                {t("title")}
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-deep">
                    {activeFilterCount}
                  </span>
                ) : null}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="border-t border-line p-4">
              <WorkshopFiltersForm
                filters={filters}
                cities={cities}
                districts={districts}
                specialties={specialties}
                vehicleTypes={vehicleTypes}
                vehicleBrands={vehicleBrands}
                idPrefix="mobil"
              />
            </div>
          </details>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
              {t("resultEyebrow")}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              {t("resultCount", { count: result.total })}
            </h2>
          </div>
          <SearchSort filters={filters} />
        </div>

        <div className="mt-4">
          <ActiveFilters
            filters={filters}
            specialties={specialties}
            vehicleTypes={vehicleTypes}
            vehicleBrands={vehicleBrands}
          />
        </div>

        {result.workshops.length > 0 ? (
          <>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {result.workshops.map((workshop) => (
                <WorkshopCard key={workshop.id} workshop={workshop} specialties={specialties} />
              ))}
            </div>
            {result.totalPages > 1 ? (
              <nav aria-label={t("paginationLabel")} className="mt-8 flex items-center justify-center gap-3">
                {result.page > 1 ? (
                  <Button asChild variant="outline">
                    <Link href={{ pathname: "/usta-ara", query: getWorkshopSearchQuery(filters, { page: result.page - 1 }) }}>{t("previousPage")}</Link>
                  </Button>
                ) : <Button variant="outline" disabled>{t("previousPage")}</Button>}
                <span className="text-sm text-muted-foreground">{t("pageStatus", { page: result.page, total: result.totalPages })}</span>
                {result.page < result.totalPages ? (
                  <Button asChild variant="outline">
                    <Link href={{ pathname: "/usta-ara", query: getWorkshopSearchQuery(filters, { page: result.page + 1 }) }}>{t("nextPage")}</Link>
                  </Button>
                ) : <Button variant="outline" disabled>{t("nextPage")}</Button>}
              </nav>
            ) : null}
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-card px-6 py-14 text-center shadow-card">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <SearchX aria-hidden="true" className="size-7" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-ink">
              {t("noResultsTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {t("noResultsDescription")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/usta-ara">{t("clearAll")}</Link>
              </Button>
              {filters.city || filters.district || filters.specialty ? (
                <Button asChild variant="outline">
                  <Link
                    href={{
                      pathname: "/usta-ara",
                      query: getWorkshopSearchQuery(filters, {
                      city: "",
                      district: "",
                      brand: "",
                      specialty: "",
                      vehicleType: "",
                    }),
                    }}
                  >
                    {t("removeLocation")}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
