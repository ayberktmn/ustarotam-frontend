"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableCatalogSelect } from "@/features/auth/province-select";
import { useDistricts, useProvinces } from "@/features/catalog/queries";
import type { WorkshopPanelServiceArea } from "@/types/usta-panel";

interface ServiceAreasEditorProps {
  areas: WorkshopPanelServiceArea[];
  onDone: () => void;
}

function ServiceAreasEditor({ areas, onDone }: ServiceAreasEditorProps) {
  const t = useTranslations("workshopPanel.profile");
  const provinces = useProvinces();
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const districts = useDistricts(provinceId || undefined);
  const province = (provinces.data ?? []).find((item) => item.id === provinceId);
  const district = (districts.data ?? []).find((item) => item.id === districtId);
  const draftArea = province && district ? `${province.name} / ${district.name}` : null;

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-dashed border-line bg-cream p-4">
      <p className="text-sm font-semibold text-ink">{t("editServiceAreas")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <SearchableCatalogSelect items={provinces.data ?? []} value={provinceId} onChange={(value) => { setProvinceId(value); setDistrictId(""); }} disabled={provinces.isPending} id="service-area-province" name="serviceAreaProvince" label={t("serviceAreaProvince")} placeholder={t("serviceAreaProvince")} searchLabel={t("serviceAreaProvinceSearch")} clearSearchLabel={t("serviceAreaClearSearch")} emptyLabel={t("serviceAreaEmpty")} />
        <SearchableCatalogSelect items={districts.data ?? []} value={districtId} onChange={setDistrictId} disabled={!provinceId || districts.isPending} id="service-area-district" name="serviceAreaDistrict" label={t("serviceAreaDistrict")} placeholder={t("serviceAreaDistrict")} searchLabel={t("serviceAreaDistrictSearch")} clearSearchLabel={t("serviceAreaClearSearch")} emptyLabel={t("serviceAreaEmpty")} />
      </div>
      {draftArea ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Plus aria-hidden="true" className="size-3.5 text-brand" />{draftArea}</p> : null}
      <div className="flex flex-wrap gap-2">
        {areas.map((area) => <Badge key={`${area.city}-${area.district}`} variant="secondary"><MapPin aria-hidden="true" />{area.city} / {area.district}</Badge>)}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("serviceAreasComingSoon")}</p>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled>{t("save")}</Button><Button type="button" variant="ghost" size="sm" onClick={onDone}>{t("cancel")}</Button></div>
    </div>
  );
}

export { ServiceAreasEditor };
