"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdatePanelProfile } from "@/features/usta-panel/queries";
import { useSpecialtyCatalog } from "@/features/catalog/queries";
import { panelText } from "@/features/usta-panel/text";
import type { Locale, LocalizedText } from "@/types/locale";
import type { WorkshopPanelProfile } from "@/types/usta-panel";

const profileFormSchema = z.object({
  name: z.string().trim().min(3).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9 ()-]{7,20}$/),
  about: z.string().trim().min(20).max(1000),
});

type FieldErrors = Partial<Record<"name" | "phone" | "about" | "specialties", string>>;

interface ProfileFormProps {
  profile: WorkshopPanelProfile;
  onDone: () => void;
}

function ProfileForm({ profile, onDone }: ProfileFormProps) {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const updateProfile = useUpdatePanelProfile();
  const specialties = useSpecialtyCatalog();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [about, setAbout] = useState(panelText(profile.about, locale));
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [specialtyIds, setSpecialtyIds] = useState(profile.specialtyIds);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = profileFormSchema.safeParse({ name, phone, about });

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

    const nextAbout: LocalizedText = {
      ...profile.about,
      [locale]: parsed.data.about,
    };

    try {
      await updateProfile.mutateAsync({
        name: parsed.data.name,
        phone: parsed.data.phone,
        about: nextAbout,
        specialtyIds,
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

      <fieldset>
        <legend className="text-sm font-semibold text-ink">{t("profile.specialties")}</legend>
        <p className="mt-1 text-xs text-muted-foreground">{t("profile.specialtiesHint")}</p>
        <div className="relative mt-3">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={specialtySearch}
            onChange={(event) => setSpecialtySearch(event.target.value)}
            placeholder={t("profile.specialtiesSearch")}
            className="pl-9"
          />
        </div>
        {specialties.isError ? <p className="mt-2 text-xs font-semibold text-destructive">{t("profile.specialtiesLoadError")}</p> : null}
        <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-line bg-card p-2 sm:grid-cols-2">
          {(specialties.data ?? []).filter((item) => item.name.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US").includes(specialtySearch.trim().toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US"))).map((item) => {
            const selected = specialtyIds.includes(item.id);
            return <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm hover:bg-brand-soft">
              <input type="checkbox" checked={selected} onChange={() => {
                setSpecialtyIds((current) => selected ? current.filter((id) => id !== item.id) : [...current, item.id]);
                setErrors((current) => ({ ...current, specialties: undefined }));
              }} className="sr-only" />
              <span aria-hidden="true" className={`flex size-5 items-center justify-center rounded border ${selected ? "border-brand bg-brand text-white" : "border-line bg-card"}`}>
                {selected ? <Check className="size-3.5" /> : null}
              </span>
              {item.name}
            </label>;
          })}
        </div>
        {errors.specialties ? <p className="mt-2 text-xs font-semibold text-destructive">{errors.specialties}</p> : null}
      </fieldset>

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
