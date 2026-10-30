"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdatePanelProfile } from "@/features/usta-panel/queries";
import { useDistricts, useProvinces, useSpecialtyCatalog, useVehicleBrands, useVehicleTypeCatalog } from "@/features/catalog/queries";
import { SearchableCatalogSelect } from "@/features/auth/province-select";
import { ApplicationServices } from "@/features/workshop-application/application-services";
import { panelText } from "@/features/usta-panel/text";
import type { Locale, LocalizedText } from "@/types/locale";
import type { WorkshopPanelProfile } from "@/types/usta-panel";

const profileFormSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9 ()-]{7,20}$/),
  about: z.string().trim().min(20).max(1000),
  address: z.string().trim().min(5).max(500),
  provinceId: z.string().min(1),
  districtId: z.string().min(1),
});

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "about" | "address" | "location" | "specialties" | "vehicleTypes", string>>;

interface ProfileFormProps {
  profile: WorkshopPanelProfile;
  onDone: () => void;
}

function ProfileForm({ profile, onDone }: ProfileFormProps) {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const updateProfile = useUpdatePanelProfile();
  const specialties = useSpecialtyCatalog();
  const vehicleTypes = useVehicleTypeCatalog();
  const brands = useVehicleBrands();
  const provinces = useProvinces();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [about, setAbout] = useState(panelText(profile.about, locale));
  const [address, setAddress] = useState(panelText(profile.address, locale));
  const [provinceId, setProvinceId] = useState(profile.provinceId);
  const [districtId, setDistrictId] = useState(profile.districtId);
  const districts = useDistricts(provinceId || undefined);
  const [specialtyIds, setSpecialtyIds] = useState(profile.specialtyIds);
  const [vehicleTypeIds, setVehicleTypeIds] = useState(profile.vehicleTypeIds);
  const [brandIds, setBrandIds] = useState(profile.brandIds);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = profileFormSchema.safeParse({ name, email, phone, about, address, provinceId, districtId });

    if (!parsed.success) {
      const fields = new Set(
        parsed.error.issues.map((issue) => issue.path[0]),
      );
      const nextErrors: FieldErrors = {};

      if (fields.has("name")) {
        nextErrors.name = t("profile.errors.name");
      }

      if (fields.has("phone")) {
        nextErrors.phone = t("profile.errors.phone");
      }

      if (fields.has("email")) nextErrors.email = t("profile.errors.email");
      if (fields.has("address")) nextErrors.address = t("profile.errors.address");
      if (fields.has("provinceId") || fields.has("districtId")) nextErrors.location = t("profile.errors.location");

      if (fields.has("about")) {
        nextErrors.about = t("profile.errors.about");
      }

      setErrors(nextErrors);
      return;
    }

    if (specialtyIds.length === 0) {
      setErrors({ specialties: t("profile.errors.specialties") });
      return;
    }
    if (vehicleTypeIds.length === 0) { setErrors({ vehicleTypes: t("profile.errors.vehicleTypes") }); return; }

    const nextAbout: LocalizedText = {
      ...profile.about,
      [locale]: parsed.data.about,
    };

    try {
      await updateProfile.mutateAsync({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        provinceId: parsed.data.provinceId,
        districtId: parsed.data.districtId,
        address: parsed.data.address,
        about: nextAbout,
        specialtyIds,
        vehicleTypeIds,
        brandIds,
      });
      toast.success(t("profile.saved"));
      setErrors({});
      onDone();
    } catch {
      toast.error(t("profile.errors.generic"));
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="panel-profile-name">{t("profile.name")}</Label>
          <Input
            id="panel-profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name ? "panel-profile-name-error" : undefined
            }
            className="mt-1.5"
          />
          {errors.name ? (
            <p
              id="panel-profile-name-error"
              className="mt-1.5 text-xs font-semibold text-destructive"
            >
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="panel-profile-email">{t("profile.email")}</Label>
          <Input id="panel-profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} className="mt-1.5" />
          {errors.email ? <p className="mt-1.5 text-xs font-semibold text-destructive">{errors.email}</p> : null}
        </div>

        <div>
          <Label htmlFor="panel-profile-phone">{t("profile.phone")}</Label>
          <Input
            id="panel-profile-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={
              errors.phone ? "panel-profile-phone-error" : undefined
            }
            className="mt-1.5"
          />
          {errors.phone ? (
            <p
              id="panel-profile-phone-error"
              className="mt-1.5 text-xs font-semibold text-destructive"
            >
              {errors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="panel-profile-province">{t("profile.province")}</Label><div className="mt-1.5"><SearchableCatalogSelect items={provinces.data ?? []} value={provinceId} onChange={(value) => { setProvinceId(value); setDistrictId(""); }} disabled={provinces.isPending} invalid={Boolean(errors.location)} id="panel-profile-province" name="provinceId" label={t("profile.province")} placeholder={t("profile.serviceAreaProvince")} searchLabel={t("profile.serviceAreaProvinceSearch")} clearSearchLabel={t("profile.serviceAreaClearSearch")} emptyLabel={t("profile.serviceAreaEmpty")} /></div></div>
        <div><Label htmlFor="panel-profile-district">{t("profile.district")}</Label><div className="mt-1.5"><SearchableCatalogSelect items={districts.data ?? []} value={districtId} onChange={setDistrictId} disabled={!provinceId || districts.isPending} invalid={Boolean(errors.location)} id="panel-profile-district" name="districtId" label={t("profile.district")} placeholder={t("profile.serviceAreaDistrict")} searchLabel={t("profile.serviceAreaDistrictSearch")} clearSearchLabel={t("profile.serviceAreaClearSearch")} emptyLabel={t("profile.serviceAreaEmpty")} /></div></div>
      </div>
      {errors.location ? <p className="text-xs font-semibold text-destructive">{errors.location}</p> : null}

      <div><Label htmlFor="panel-profile-address">{t("profile.address")}</Label><Textarea id="panel-profile-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={500} aria-invalid={Boolean(errors.address)} className="mt-1.5 min-h-20" />{errors.address ? <p className="mt-1.5 text-xs font-semibold text-destructive">{errors.address}</p> : null}</div>

      <div>
        <Label htmlFor="panel-profile-about">{t("profile.about")}</Label>
        <Textarea
          id="panel-profile-about"
          value={about}
          onChange={(event) => setAbout(event.target.value)}
          maxLength={1000}
          aria-invalid={Boolean(errors.about)}
          aria-describedby={
            errors.about ? "panel-profile-about-error" : undefined
          }
          className="mt-1.5"
        />
        {errors.about ? (
          <p
            id="panel-profile-about-error"
            className="mt-1.5 text-xs font-semibold text-destructive"
          >
            {errors.about}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("profile.aboutHint")}
          </p>
        )}
      </div>

      <ApplicationServices value={{ vehicleTypeIds, brandIds, specialtyIds }} onChange={(value) => { setVehicleTypeIds(value.vehicleTypeIds); setBrandIds(value.brandIds); setSpecialtyIds(value.specialtyIds); setErrors((current) => ({ ...current, vehicleTypes: undefined, specialties: undefined })); }} vehicleTypes={vehicleTypes.data ?? []} brands={brands.data ?? []} specialties={specialties.data ?? []} errors={{ vehicleTypeIds: errors.vehicleTypes, specialtyIds: errors.specialties }} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {updateProfile.isPending
            ? t("profile.saving")
            : t("profile.save")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={updateProfile.isPending}
        >
          <X aria-hidden="true" />
          {t("profile.cancel")}
        </Button>
      </div>
    </form>
  );
}

export { ProfileForm };
