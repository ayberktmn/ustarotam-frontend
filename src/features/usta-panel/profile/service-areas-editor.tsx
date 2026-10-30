"use client";

import { useState } from "react";
import { Loader2, MapPin, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableCatalogSelect } from "@/features/auth/province-select";
import { useDistricts, useProvinces } from "@/features/catalog/queries";
import { usePanelServiceAreas, useUpdatePanelServiceAreas } from "@/features/usta-panel/queries";
import type { WorkshopPanelServiceArea } from "@/types/usta-panel";

interface ServiceAreasEditorProps {
  areas: WorkshopPanelServiceArea[];
  onDone: () => void;
}

function ServiceAreasEditor({ areas: initialAreas, onDone }: ServiceAreasEditorProps) {
  const t = useTranslations("workshopPanel.profile");
  const provinces = useProvinces();
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const districts = useDistricts(provinceId || undefined);
  const serviceAreas = usePanelServiceAreas();
  const updateAreas = useUpdatePanelServiceAreas();
  const [draftAreas, setDraftAreas] = useState<WorkshopPanelServiceArea[] | null>(null);
  const areas = draftAreas ?? serviceAreas.data ?? initialAreas;
  const province = (provinces.data ?? []).find((item) => item.id === provinceId);
  const district = (districts.data ?? []).find((item) => item.id === districtId);
  const draftArea = province && district ? `${province.name} / ${district.name}` : null;

  function addArea(): void {
    if (!province || !district || areas.some((area) => area.provinceId === province.id && area.districtId === district.id)) return;
    setDraftAreas((current) => [...(current ?? areas), { provinceId: province.id, districtId: district.id, city: province.name, district: district.name }]);
    setProvinceId(""); setDistrictId("");
  }

  async function save(): Promise<void> {
    try {
      await updateAreas.mutateAsync(areas.map(({ provinceId: areaProvinceId, districtId: areaDistrictId }) => ({ provinceId: areaProvinceId, districtId: areaDistrictId })));
      toast.success(t("serviceAreasSaved")); onDone();
    } catch { toast.error(t("serviceAreasSaveError")); }
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-dashed border-line bg-cream p-4">
      <p className="text-sm font-semibold text-ink">{t("editServiceAreas")}</p>
      {serviceAreas.isPending ? <p className="text-xs text-muted-foreground">{t("serviceAreasLoading")}</p> : null}
      {serviceAreas.isError ? <p role="alert" className="text-xs font-semibold text-destructive">{t("serviceAreasLoadError")}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <SearchableCatalogSelect items={provinces.data ?? []} value={provinceId} onChange={(value) => { setProvinceId(value); setDistrictId(""); }} disabled={provinces.isPending} id="service-area-province" name="serviceAreaProvince" label={t("serviceAreaProvince")} placeholder={t("serviceAreaProvince")} searchLabel={t("serviceAreaProvinceSearch")} clearSearchLabel={t("serviceAreaClearSearch")} emptyLabel={t("serviceAreaEmpty")} />
        <SearchableCatalogSelect items={districts.data ?? []} value={districtId} onChange={setDistrictId} disabled={!provinceId || districts.isPending} id="service-area-district" name="serviceAreaDistrict" label={t("serviceAreaDistrict")} placeholder={t("serviceAreaDistrict")} searchLabel={t("serviceAreaDistrictSearch")} clearSearchLabel={t("serviceAreaClearSearch")} emptyLabel={t("serviceAreaEmpty")} />
      </div>
      {draftArea ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Plus aria-hidden="true" className="size-3.5 text-brand" />{draftArea}</p> : null}
      <Button type="button" variant="outline" size="sm" onClick={addArea} disabled={!draftArea || updateAreas.isPending}><Plus aria-hidden="true" />{t("addServiceArea")}</Button>
      <div className="flex flex-wrap gap-2">
        {areas.map((area) => <Badge key={`${area.provinceId}-${area.districtId ?? "all"}`} variant="secondary"><MapPin aria-hidden="true" />{area.city}{area.district ? ` / ${area.district}` : ""}<button type="button" aria-label={t("removeServiceArea", { area: `${area.city} ${area.district}` })} onClick={() => setDraftAreas(areas.filter((item) => item.provinceId !== area.provinceId || item.districtId !== area.districtId))}><X aria-hidden="true" className="size-3.5" /></button></Badge>)}
      </div>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={updateAreas.isPending || serviceAreas.isError} onClick={() => void save()}>{updateAreas.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}{t("save")}</Button><Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={updateAreas.isPending}>{t("cancel")}</Button></div>
    </div>
  );
}

export { ServiceAreasEditor };
