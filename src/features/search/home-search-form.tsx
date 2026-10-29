"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, MapPin, Search, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchableCatalogSelect } from "@/features/auth/province-select";
import { useProvinces, useSpecialties } from "@/features/catalog/queries";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";

function HomeSearchForm() {
  const locale = useLocale() as Locale;
  const t = useTranslations("home.search");
  const common = useTranslations("common");
  const provinces = useProvinces();
  const specialties = useSpecialties();
  const [city, setCity] = useState("");
  const [specialty, setSpecialty] = useState("");
  const action = getPathname({ locale, href: "/usta-ara" });
  const provinceItems = (provinces.data ?? []).map((item) => ({...item, value: item.name}));
  const specialtyItems = (specialties.data ?? []).map((item) => ({id: item.slug, value: item.slug, name: item.name[locale]}));

  return (
    <form action={action} method="get" aria-label={common("search")}
      className="mt-8 grid gap-2 rounded-2xl bg-card p-2 shadow-search lg:grid-cols-[1.15fr_1.15fr_auto]">
      <SearchField icon={<MapPin aria-hidden="true" className="size-5" />} label={t("city")} htmlFor="hero-sehir">
        {provinces.isError ? (
          <LoadError message={t("provinceLoadError")} retryLabel={common("retry")} retry={() => void provinces.refetch()} />
        ) : (
          <SearchableCatalogSelect id="hero-sehir" name="sehir" items={provinceItems} value={city} onChange={setCity}
            disabled={provinces.isPending} label={t("city")} placeholder={t("cityPlaceholder")}
            searchLabel={t("citySearch")} clearSearchLabel={t("clearSearch")} emptyLabel={t("cityEmpty")}
            triggerClassName="h-8 border-0 bg-transparent px-0 text-sm font-semibold shadow-none hover:border-0 focus-visible:border-0 focus-visible:ring-0" />
        )}
      </SearchField>

      <SearchField icon={<Wrench aria-hidden="true" className="size-5" />} label={t("serviceCategory")} htmlFor="hero-hizmet">
        {specialties.isError ? (
          <LoadError message={t("categoryLoadError")} retryLabel={common("retry")} retry={() => void specialties.refetch()} />
        ) : (
          <SearchableCatalogSelect id="hero-hizmet" name="uzmanlik" items={specialtyItems} value={specialty} onChange={setSpecialty}
            disabled={specialties.isPending} label={t("serviceCategory")} placeholder={t("categoryPlaceholder")}
            searchLabel={t("categorySearch")} clearSearchLabel={t("clearSearch")} emptyLabel={t("categoryEmpty")}
            triggerClassName="h-8 border-0 bg-transparent px-0 text-sm font-semibold shadow-none hover:border-0 focus-visible:border-0 focus-visible:ring-0" />
        )}
      </SearchField>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
      <Button type="submit" size="lg" className="h-12 gap-2 rounded-xl px-7 lg:h-auto lg:min-h-14">
        <Search aria-hidden="true" className="size-5" />
        {t("searchButton")}
      </Button>
      <Button asChild variant="premium" size="lg" className="h-12 gap-3 rounded-xl lg:h-auto lg:min-h-14">
        <Link href="/usta-ol"><Wrench aria-hidden="true" className="size-6" />{t("joinWorkshop")}<ArrowRight aria-hidden="true" className="size-5" /></Link>
      </Button>
      </div>
    </form>
  );
}

function LoadError({message, retryLabel, retry}: {message: string; retryLabel: string; retry: () => void}) {
  return <div role="alert" className="flex min-h-8 items-center gap-2 text-xs text-destructive">
    <span>{message}</span>
    <button type="button" onClick={retry} className="shrink-0 font-semibold underline underline-offset-2">{retryLabel}</button>
  </div>;
}

function SearchField({icon, label, htmlFor, children}: {icon: ReactNode; label: string; htmlFor: string; children: ReactNode}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-soft/50 lg:border-r lg:border-line lg:last:border-r-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">{icon}</span>
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block cursor-pointer text-[0.7rem] font-medium text-muted-foreground">{label}</label>
        {children}
      </div>
    </div>
  );
}

export { HomeSearchForm };
