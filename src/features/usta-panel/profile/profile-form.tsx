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

type FieldErrors = Partial<Record<"name" | "phone" | "about", string>>;

interface ProfileFormProps {
  profile: WorkshopPanelProfile;
  onDone: () => void;
}

function ProfileForm({ profile, onDone }: ProfileFormProps) {
  const t = useTranslations("workshopPanel");
  const locale = useLocale() as Locale;
  const updateProfile = useUpdatePanelProfile();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [about, setAbout] = useState(panelText(profile.about, locale));
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

    const nextAbout: LocalizedText = {
      ...profile.about,
      [locale]: parsed.data.about,
    };

    try {
      await updateProfile.mutateAsync({
        name: parsed.data.name,
        phone: parsed.data.phone,
        about: nextAbout,
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
