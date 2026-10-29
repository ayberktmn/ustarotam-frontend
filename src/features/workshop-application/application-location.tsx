"use client";

import { useTranslations } from "next-intl";
import { SearchableCatalogSelect } from "@/features/auth/province-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogItem } from "@/lib/api";
import type { ReactElement } from "react";

export interface ApplicationLocationDraft {
  province: string;
  district: string;
  site: string;
}

interface CatalogOptions {
  data?: CatalogItem[];
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => unknown;
}

export function ApplicationLocation({value, onChange, provinces, districts, errors}: {
  errors: Partial<Record<string, string>>;
  value: ApplicationLocationDraft;
  onChange: (value: ApplicationLocationDraft) => void;
  provinces: CatalogOptions;
  districts: CatalogOptions;
}): ReactElement {
  const t = useTranslations("workshopApplication");
  const fields = [
    {key: "province", query: provinces, disabled: false},
    {key: "district", query: districts, disabled: !value.province},
  ] as const;

  return <div className="grid gap-5 sm:grid-cols-2">
    {fields.map(({key, query, disabled}) => {
      const label = t(key);
      const items = query.data ?? [];
      return <div key={key} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `application-${key}-error` : undefined} className="min-w-0 space-y-2">
        <label htmlFor={`application-${key}`} className="text-sm font-semibold text-ink">{label}<span aria-hidden="true" className="text-destructive"> *</span></label>
        <SearchableCatalogSelect id={`application-${key}`} name={key} label={label} items={items} value={value[key]}
          invalid={Boolean(errors[key])} describedBy={errors[key] ? `application-${key}-error` : undefined}
          avoidCollisions disabled={disabled || query.isPending || query.isFetching || query.isError} placeholder={key === "district" && value.province && query.isFetching ? t("districtsLoading") : t("choose")} searchLabel={t("search", {label})}
          clearSearchLabel={t("clearSearch")} emptyLabel={t("empty")}
          onChange={selected => {
            if (key === "province") onChange({...value, province: selected, district: "", site: ""});
            else onChange({...value, district: selected, site: ""});
          }} />
        {errors[key] ? <p id={`application-${key}-error`} role="alert" className="text-xs text-destructive">{errors[key]}</p> : null}
        {key === "district" && value.province && query.isFetching ? <p role="status" className="text-xs text-muted-foreground">{t("districtsLoading")}</p> : null}
        {key === "district" && value.province && !query.isPending && !query.isFetching && !query.isError && query.data?.length === 0 ? <p role="status" className="text-xs text-muted-foreground">{t("districtsEmpty")}</p> : null}
        {query.isError && !disabled ? <div role="alert" className="text-xs text-destructive">
          <p>{key === "district" ? t("districtsError") : t("catalogError")}</p>
          <Button type="button" variant="link" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>{t("retry")}</Button>
        </div> : null}
      </div>;
    })}
    <div className="min-w-0 space-y-2 sm:col-span-2">
      <label htmlFor="application-site" className="text-sm font-semibold text-ink">{t("industrialSite")}</label>
      <Input id="application-site" name="site" type="text" maxLength={180} value={value.site} placeholder={t("industrialSitePlaceholder")} onChange={event => onChange({...value, site: event.target.value})} />
      <p className="text-xs text-muted-foreground">{t("industrialSiteNotSaved")}</p>
    </div>
  </div>;
}
