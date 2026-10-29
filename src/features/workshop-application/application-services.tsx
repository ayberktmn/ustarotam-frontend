"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import type { CatalogItem } from "@/lib/api";

export interface ApplicationServicesDraft {
  vehicleTypeIds: string[];
  brandIds: string[];
  specialtyIds: string[];
}

function ChoiceGroup({label, items, selected, onChange, id, error, required, max}: {
  id: string;
  error?: string;
  required?: boolean;
  max: number;
  label: string;
  items: CatalogItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}): ReactElement {
  return <fieldset id={`application-${id}`} tabIndex={-1} aria-invalid={Boolean(error)} aria-describedby={error ? `application-${id}-error` : undefined} className="space-y-3 rounded-xl border border-line bg-cream p-4">
    <legend className="px-1 text-sm font-semibold text-ink">{label}{required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}</legend>
    {error ? <p id={`application-${id}-error`} role="alert" className="text-xs text-destructive">{error}</p> : null}
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(item => {
        const checked = selected.includes(item.id);
        return <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-card p-3 text-sm text-ink">
          <input type="checkbox" className="mt-0.5 size-4 accent-brand" checked={checked} disabled={!checked && selected.length >= max}
            onChange={() => onChange(checked ? selected.filter(id => id !== item.id) : [...selected, item.id])} />
          <span>{item.name}</span>
        </label>;
      })}
    </div>
  </fieldset>;
}

export function ApplicationServices({value, onChange, vehicleTypes, brands, specialties, errors}: {
  errors: Partial<Record<string, string>>;
  value: ApplicationServicesDraft;
  onChange: (value: ApplicationServicesDraft) => void;
  vehicleTypes: CatalogItem[];
  brands: CatalogItem[];
  specialties: CatalogItem[];
}): ReactElement {
  const t = useTranslations("workshopApplication");
  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">{t("servicesHint")}</p>
    <ChoiceGroup id="vehicleTypeIds" required max={20} error={errors.vehicleTypeIds} label={t("vehicleTypes")} items={vehicleTypes} selected={value.vehicleTypeIds}
      onChange={vehicleTypeIds => onChange({...value, vehicleTypeIds})} />
    <ChoiceGroup id="brandIds" max={100} error={errors.brandIds} label={t("brands")} items={brands} selected={value.brandIds}
      onChange={brandIds => onChange({...value, brandIds})} />
    <ChoiceGroup id="specialtyIds" required max={50} error={errors.specialtyIds} label={t("specialties")} items={specialties} selected={value.specialtyIds}
      onChange={specialtyIds => onChange({...value, specialtyIds})} />
  </div>;
}
